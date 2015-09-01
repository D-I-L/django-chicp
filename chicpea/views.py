from collections import OrderedDict
import json
import logging
import operator
import os
import re
import subprocess
from cairosvg import svg2pdf, svg2png
from svgutils.templates import VerticalLayout, ColumnLayout
from svgutils.transform import fromstring
from tempfile import NamedTemporaryFile

from django.conf import settings
from django.core.management import call_command
from django.http.response import JsonResponse, HttpResponse
from django.shortcuts import render

from chicpea import chicp_settings
from chicpea import utils
from elastic.elastic_settings import ElasticSettings
from elastic.query import BoolQuery, Query, RangeQuery, Filter
from elastic.search import Search, ElasticQuery


# Get an instance of a logger
logger = logging.getLogger(__name__)


# Create your views here.
def chicpeaDocs(request):
    context = dict()
    context['title'] = 'CHiCP Documentation'
    context['page_header'] = 'Documentation'
    return render(request, 'chicpea/docs.html', context, content_type='text/html')


def chicpea(request):
    queryDict = request.GET
    context = dict()
    context['title'] = 'Capture HiC Plotter'
    context['searchTerm'] = 'IL2RA'
    context['tissue'] = 'Total_CD4_Activated'
    if queryDict.get("term"):
        context['searchTerm'] = queryDict.get("term")
    if queryDict.get("tissue"):
        context['tissue'] = queryDict.get("tissue")
    else:
        context['default_target'] = getattr(chicp_settings, 'DEFAULT_TARGET')
        context['default_tissue'] = getattr(chicp_settings, 'DEFAULT_TISSUE')

    indexes = list()
    tissues = list()
    for idx in getattr(chicp_settings, 'TARGET_IDXS'):
        indexes.append({"value": idx, "text": getattr(chicp_settings, 'TARGET_IDXS').get(idx)})
        elasticJSON = Search(idx=idx).get_mapping(mapping_type="gene_target")
        tissueList = list(elasticJSON[idx]['mappings']['gene_target']['_meta']['tissue_type'].keys())
        utils.tissues[idx] = tissueList
        tissueList.sort()
        for t in tissueList:
            tissues.append({"value": t, "text": t.replace("_", " "), "class": idx})
    context['allIndexes'] = indexes
    context['allTissues'] = tissues

    snpTracks = OrderedDict()
    defaultTrack = getattr(chicp_settings, 'DEFAULT_TRACK')
    for group in getattr(chicp_settings, 'CHICP_IDX'):
        snp_tracks = list()
        for track in getattr(chicp_settings, 'CHICP_IDX').get(group).get('TRACKS'):
            snp_tracks.append({"value": track,
                               "text":  getattr(chicp_settings, 'CHICP_IDX').get(group).get('TRACKS')
                               .get(track).get('NAME')})
            if defaultTrack == '':
                defaultTrack = getattr(chicp_settings, 'CHICP_IDX').get(group).get('TRACKS').get(track).get('NAME')
        snpTracks[getattr(chicp_settings, 'CHICP_IDX').get(group).get('NAME')] = snp_tracks
    context['snpTracks'] = snpTracks

    if queryDict.get("snp_track"):
        context['snp_track'] = queryDict.get("snp_track")
    else:
        context['snp_track'] = defaultTrack

    # return render(request, 'chicpea/index3.html', context, content_type='text/html')
    # return render(request, 'chicpea/index2.html', context, content_type='text/html')
    return render(request, 'chicpea/index.html', context, content_type='text/html')


def chicpeaFileUpload(request, url):
    filesDict = request.FILES
    files = filesDict.getlist("files[]")
    print(files)
    snpTracks = list()
    idx = getattr(chicp_settings, 'CHICP_IDX').get('userdata').get('INDEX')

    for f in files:
        line = f.readlines()[0].decode()
        if line.startswith("#"):
            line = f.readlines()[1].decode()

        parts = re.split("\t", line)
        if re.match("\s", line):
            parts = re.split("\s", line)

        if len(parts) != 5:
            logger.warn("WARNING: unexpected number of columns: "+line)
            continue

        f.seek(0)
        bedFile = NamedTemporaryFile(delete=False)
        bedFile.write(f.read())
        bedFile.close()
        idx_type = os.path.basename(bedFile.name)
        snpTracks.append({"value": idx_type, "text":  f.name})
        os.system("curl -XDELETE '"+ElasticSettings.url()+"/"+idx+"/"+idx_type+"'")
        call_command("index_search", indexName=idx, indexType=idx_type, indexBED=bedFile.name)
        logger.debug("--indexName "+idx+" --indexType "+idx_type+" --indexBED "+bedFile.name)
        bedFile.delete

    context = dict()
    context['userSNPTracks'] = snpTracks
    return HttpResponse(json.dumps(context), content_type="application/json")


def chicpeaDeleteUD(request, url):
    queryDict = request.POST
    idx_type = queryDict.get("userDataIdx")
    idx = getattr(chicp_settings, 'CHICP_IDX').get('userdata').get('INDEX')
    output = subprocess.check_output("curl -XDELETE '"+ElasticSettings.url()+"/"+idx+"/"+idx_type+"'", shell=True)
    return HttpResponse(output, content_type="application/json")


def chicpeaSearch(request, url):
    queryDict = request.GET
    targetIdx = queryDict.get("targetIdx")
    blueprint = {}
    hic = []
    addList = []
    searchType = 'gene'
    searchTerm = queryDict.get("searchTerm").upper()

    logger.warn("### "+searchType+" - "+searchTerm+' ###')

    if queryDict.get("region") or re.match(r"(.*):(\d+)-(\d+)", queryDict.get("searchTerm")):
        searchType = 'region'
        region = queryDict.get("searchTerm")
        if queryDict.get("region"):
            region = queryDict.get("region")
        else:
            searchTerm = ""
        mo = re.match(r"(.*):(\d+)-(\d+)", region)
        (chrom, segmin, segmax) = mo.group(1, 2, 3)
        chrom = chrom.replace('chr', "")
    if re.search("^rs[0-9]+", queryDict.get("searchTerm").lower()):
        searchTerm = queryDict.get("searchTerm").lower()
        addList.append(_find_snp_position(queryDict.get("snp_track"), searchTerm))
        if addList[0].get("error"):
            return JsonResponse({'error': addList[0]['error']})
        position = addList[0]['end']
        if searchType != 'region':
            searchType = 'snp'

    if searchType == 'region':
        query_bool = BoolQuery()
        filter_bool = BoolQuery()
        if searchTerm and len(addList) == 0:
            query_bool.must([Query.query_string(searchTerm, fields=["name", "ensg"]),
                             Query.term("baitChr", chrom),
                             Query.term("oeChr", chrom),
                             RangeQuery("dist", gte=-2e6, lte=2e6)])
        else:
            query_bool.must([Query.term("baitChr", chrom),
                             Query.term("oeChr", chrom),
                             RangeQuery("dist", gte=-2e6, lte=2e6)])

        query_bool = _add_tissue_filter(query_bool, targetIdx)

        if len(addList) > 0:
            filter_bool.should([BoolQuery(must_arr=[RangeQuery("baitStart", lte=position),
                                                    RangeQuery("baitEnd", gte=position)]),
                                BoolQuery(must_arr=[RangeQuery("oeStart", lte=position),
                                                    RangeQuery("oeEnd", gte=position)])])
        else:
            filter_bool.should([BoolQuery(must_arr=[RangeQuery("baitStart", gte=segmin, lte=segmax),
                                                    RangeQuery("baitEnd", gte=segmin, lte=segmax)]),
                                BoolQuery(must_arr=[RangeQuery("oeStart", gte=segmin, lte=segmax),
                                                    RangeQuery("oeEnd", gte=segmin, lte=segmax)])])

        query = ElasticQuery.filtered_bool(query_bool, filter_bool, sources=utils.hicFields + utils.tissues[targetIdx])
        (hic, v1, v2) = _build_hic_query(query, targetIdx, segmin, segmax)
        # print(hic)

        if len(hic) == 0:
            retJSON = {'error': queryDict.get("searchTerm")+' does not overlap any bait/target regions in this dataset.'}
            return JsonResponse(retJSON)

    elif searchType == 'snp':
        if len(addList) > 0:
            chrom = addList[0]['chr']

            query_bool = BoolQuery()
            query_bool.must([Query.term("baitChr", chrom),
                             Query.term("oeChr", chrom),
                             RangeQuery("dist", gte=-2e6, lte=2e6)])
            query_bool = _add_tissue_filter(query_bool, targetIdx)

            filter_bool = BoolQuery()
            filter_bool.should([BoolQuery(must_arr=[RangeQuery("baitStart", lte=position),
                                                    RangeQuery("baitEnd", gte=position)]),
                                BoolQuery(must_arr=[RangeQuery("oeStart", lte=position),
                                                    RangeQuery("oeEnd", gte=position)])])

            query = ElasticQuery.filtered_bool(query_bool, filter_bool,
                                               sources=utils.hicFields + utils.tissues[targetIdx])
            hic, segmin, segmax = _build_hic_query(query, targetIdx)

            if len(hic) == 0:
                retJSON = {'error': 'Marker '+searchTerm+' does not overlap any bait/target regions in this dataset.'}
                return JsonResponse(retJSON)
    else:
        query_bool = BoolQuery()
        query_bool.must([RangeQuery("dist", gte=-2e6, lte=2e6)])
        query_bool = _add_tissue_filter(query_bool, targetIdx)
        query = ElasticQuery.filtered_bool(Query.query_string(searchTerm, fields=["name", "ensg", "oeName"]),
                                           query_bool, sources=utils.hicFields + utils.tissues[targetIdx])

        hic, segmin, segmax = _build_hic_query(query, targetIdx)

        if len(hic) == 0:
            retJSON = {'error': 'Gene name '+searchTerm+' not found in this dataset.'}
            return JsonResponse(retJSON)
        chrom = hic[0]['baitChr']

    try:
        chrom
    except NameError:
        retJSON = {'error': 'No chromosome defined for search'}
        return JsonResponse(retJSON)

    # get genes based on this segment
    genes = _build_gene_query(chrom, segmin, segmax)
    (snps, snpMeta) = _build_snp_query(queryDict.get("snp_track"), chrom, segmin, segmax)
    frags = _build_frags_query(getattr(chicp_settings, 'DEFAULT_FRAG'), chrom, segmin, segmax)

    addList = utils.makeRelative(int(segmin), int(segmax), ['start', 'end'], addList)

    retJSON = {"hic": hic,
               "frags": frags,
               "meta": {"ostart": int(segmin),
                        "oend": int(segmax),
                        "rstart": 1,
                        "rend": int(segmax) - int(segmin),
                        "rchr": str(chrom),
                        "tissues": utils.tissues[targetIdx]},
               "snps": snps,
               "snp_meta": snpMeta,
               "genes": genes,
               "region": str(chrom) + ":" + str(segmin) + "-" + str(segmax),
               "blueprint": blueprint,
               "extra": addList
               }

    response = JsonResponse(retJSON)
    return response


def chicpeaSubSearch(request, url):
    queryDict = request.GET
    tissue = queryDict.get("tissue")
    region = queryDict.get("region")
    mo = re.match(r"(.*):(\d+)-(\d+)", region)
    (chrom, segmin, segmax) = mo.group(1, 2, 3)

    genes = _build_gene_query(chrom, segmin, segmax)
    exons = _build_exon_query(chrom, segmin, segmax, genes)
    (snps, snpMeta) = _build_snp_query(queryDict.get("snp_track"), chrom, segmin, segmax)
    blueprint = {}

    if getattr(chicp_settings, 'sampleLookup').get(tissue):
        blueprint = _build_bigbed_query(tissue, chrom, segmin, segmax)

    retJSON = {"blueprint": blueprint,
               "region": str(chrom) + ":" + str(segmin) + "-" + str(segmax),
               "genes": genes,
               "exons": exons,
               "snps": snps,
               "snp_meta": snpMeta
               }
    response = JsonResponse(retJSON)
    return response


def chicpeaDownload(request, url):
    queryDict = request.POST
    output_format = queryDict.get("output_format")
    CSS = queryDict.get("css-styles")
    WIDTH = int(queryDict.get("svg-width")) + 40 + 50
    HEIGHT = int(queryDict.get("svg-height")) + 60
    tissue = queryDict.get("tissue").replace(' ', '_')
    returnFileName = 'CHiCP-' + queryDict.get("searchTerm") + '-' + tissue + '.' + output_format

    fig1 = fromstring(queryDict.get("data-main"))
    layout = ColumnLayout(1)
    layout.add_figure(fig1)

    if queryDict.get("data-bait") and queryDict.get("data-target"):
        s1 = queryDict.get("data-bait")
        s2 = queryDict.get("data-target")
        layoutPanels = VerticalLayout()
        layoutPanels.add_figure(fromstring(s1))
        layoutPanels.add_figure(fromstring(s2))
        layoutPanels._generate_layout()
        svgPanels = layoutPanels.to_str()
        fig2 = fromstring(svgPanels)
    else:
        fig2 = fromstring("<svg></svg>")

    layout.add_figure(fig2)
    layout._generate_layout()
    SVG = layout.to_str().decode()
    p = re.compile(r'translate\((\d+), 0\)')
    m = p.search(SVG)
    SVG = re.sub(r'translate\(\d+, 0\)', r'translate('+str(int(m.group(1)) + 60)+', 50)', SVG)
    SVG = SVG.replace('translate(0, 270)', 'translate(0, 390)')

    SVG = SVG.replace('<g>', '<g transform="translate(20,30) scale(1)">', 1)
    SVG = SVG.replace('<svg ', '<svg style="width:'+str(WIDTH)+'px;height:'+str(HEIGHT)+'px;" ')
    SVG = SVG.replace("</svg>", '<defs><style type="text/css">'+CSS+'</style></defs></svg>')

    if output_format == "svg":
        response = HttpResponse(content_type='image/svg+xml')
        response['Content-Disposition'] = 'attachment; filename="' + returnFileName + '"'
        response.write(SVG)
    elif output_format == "pdf" or output_format == "png":
        mime_type = "application/x-pdf" if output_format == "pdf" else "image/png"

        response = HttpResponse(content_type=mime_type)
        response['Content-Disposition'] = 'attachment; filename="' + returnFileName + '"'
        iFile = NamedTemporaryFile(delete=False)
        oFile = NamedTemporaryFile(delete=False)
        iFile.write(SVG.encode())
        iFile.close()

        if output_format == "pdf":
            svg2pdf(SVG.encode('utf-8'), write_to=str(oFile.name))
        else:
            svg2png(SVG.encode('utf-8'), write_to=str(oFile.name))

        fileData = oFile.read()
        response.write(fileData)
    else:
        retJSON = {"error": "output format was not recognised"}
        response = JsonResponse(retJSON)
    return response


def _add_tissue_filter(bool_query, targetIdx):

    tissueFilter = list()
    for t in utils.tissues[targetIdx]:
        tissueFilter.append(RangeQuery(t, gte=5))

    bool_query.should(tissueFilter)
    return bool_query


def _build_hic_query(query, targetIdx, segmin=0, segmax=0):

    hic = []

    hicElastic = Search(query, idx=targetIdx, search_from=0, size=2000)
    hicResult = hicElastic.get_result()
    if len(hicResult['data']) > 0:
        hic = hicResult['data']
        if segmin == 0 or segmax == 0:
            (segmin, segmax) = utils.segCoords(hic)
            extension = int(0.05*(segmax-segmin))
            segmin = segmin - extension
            segmax = segmax + extension
        hic = utils.makeRelative(int(segmin), int(segmax), ['baitStart', 'baitEnd', 'oeStart', 'oeEnd'], hic)
    return hic, segmin, segmax


def _build_gene_query(chrom, segmin, segmax):
    # get genes based on this segment
    geneQuery = Search.range_overlap_query(seqid=chrom, start_range=segmin, end_range=segmax, search_from=0,
                                           size=2000, idx=getattr(chicp_settings, 'CP_GENE_IDX')+'/genes/',
                                           field_list=utils.geneFields)
    geneResult = geneQuery.get_result()
    genes = geneResult['data']
    genes = utils.makeRelative(int(segmin), int(segmax), ['start', 'end'], genes)
    genes = [utils.flattenAttr(o) for o in genes]
    for o in genes:
        o.update({"bumpLevel": 0})
        o.update({"length": (o['end']-o['start'])})
    genes.sort(key=operator.itemgetter('length'))
    return genes


def _build_exon_query(chrom, segmin, segmax, genes):
    # get exonic structure for genes in this section
    geneExons = dict()
    query_bool = BoolQuery()
    query_bool.must([Query.term("seqid", chrom)])
    if len(genes) > 0:
        for g in genes:
            query = ElasticQuery.filtered_bool(Query.query_string(g["gene_id"], fields=["name"]),
                                               query_bool, sources=utils.snpFields)
            elastic = Search(query, idx=getattr(chicp_settings, 'CP_GENE_IDX')+'/exons/', search_from=0, size=2000)
            result = elastic.get_result()
            exons = result['data']
            exons = utils.makeRelative(int(segmin), int(segmax), ['start', 'end'], exons)
            geneExons[g["gene_id"]] = sorted(exons, key=operator.itemgetter("start"))
    return geneExons


def _find_snp_position(snp_track, name):
    mo = re.match(r"(.*)-(.*)", snp_track)
    (group, track) = mo.group(1, 2)
    snp_track_idx = getattr(chicp_settings, 'CHICP_IDX').get(group).get('INDEX')
    snp_track_type = ''
    if getattr(chicp_settings, 'CHICP_IDX').get(group).get('TRACKS').get(snp_track):
        snp_track_type = getattr(chicp_settings, 'CHICP_IDX').get(group).get('TRACKS') \
            .get(snp_track).get('TYPE')
    else:
        snp_track_type = track

    query = ElasticQuery.query_match("name", name)
    elastic = Search(query, idx=snp_track_idx+'/'+snp_track_type)
    snpResult = elastic.get_result()
    if (len(snpResult['data']) > 0):
        chrom = snpResult['data'][0]['seqid'].replace('chr', "")
        position = snpResult['data'][0]['end']
        return {'chr': chrom, 'start': (position-1), 'end': position, 'name': name}
    return {'error': 'Marker '+name+' does not exist in the currently selected dataset'}


def _build_snp_query(snp_track, chrom, segmin, segmax):
    snps = []
    snpMeta = {}
    maxScore = -1
    if snp_track and snp_track != 'None':
        # get SNPs based on this segment
        mo = re.match(r"(.*)-(.*)", snp_track)
        (group, track) = mo.group(1, 2)
        snp_track_idx = getattr(chicp_settings, 'CHICP_IDX').get(group).get('INDEX')
        snp_track_type = ''
        if getattr(chicp_settings, 'CHICP_IDX').get(group).get('TRACKS').get(snp_track):
            snp_track_type = getattr(chicp_settings, 'CHICP_IDX').get(group).get('TRACKS') \
                .get(snp_track).get('TYPE')
        else:
            snp_track_type = track

        query = ElasticQuery.filtered(Query.terms("seqid", [chrom, str("chr"+chrom)]),
                                      Filter(RangeQuery("end", gte=segmin, lte=segmax)),
                                      utils.snpFields)
        snpQuery = Search(search_query=query, search_from=0, size=2000000, idx=snp_track_idx+'/'+snp_track_type)

        snpResult = snpQuery.get_result()
        snps = snpResult['data']
        snps = utils.makeRelative(int(segmin), int(segmax), ['start', 'end'], snps)

        data_type = getattr(chicp_settings, 'CHICP_IDX').get(group).get('DATA_TYPE')
        snpSettings = getattr(chicp_settings, 'STUDY_DEFAULTS').get(data_type)
#        if 'max' in snpSettings:
#            maxScore = float(snpSettings['max'])
#        else:
        for s in snps:
            if float(s['score']) > maxScore:
                maxScore = float(s['score'])
        snpSettings['max'] = maxScore

        snpMeta = snpSettings

    return snps, snpMeta


def _build_frags_query(frags_idx, chrom, segmin, segmax):

    query = ElasticQuery.filtered(Query.terms("seqid", [chrom, str("chr"+chrom)]),
                                  Filter(RangeQuery("end", gte=segmin, lte=segmax)),
                                  utils.bedFields)
    fragsQuery = Search(search_query=query, search_from=0, size=2000000, idx=frags_idx)

    fragsResult = fragsQuery.get_result()
    frags = fragsResult['data']
    frags = utils.makeRelative(int(segmin), int(segmax), ['start', 'end'], frags)
    return frags


def _build_bigbed_query(tissue, chrom, segmin, segmax):
    dataDir = os.path.join(settings.STATIC_ROOT, "chicpea/data/")
    bigbedData = {}
    sampleLookup = getattr(chicp_settings, 'sampleLookup')
    for s in sampleLookup.get(tissue):
        bp = []
        inFile = dataDir+s+".bb"
        if (os.path.exists(inFile)):
            outFile = NamedTemporaryFile(delete=False)
            os.system("bigBedToBed "+inFile+" "+str(outFile.name)+" -chrom=chr"+chrom+" -start="+segmin+" -end="+segmax)
            with open(str(outFile.name)) as f:
                for line in f:
                    parts = re.split(r'\t+', line.rstrip('\n'))
                    if len(parts) == 4:
                        bp.append({'start': parts[1], 'end': parts[2], 'name': parts[3], 'sample': s,
                                   'desc': getattr(chicp_settings, 'stateLookup').get(parts[3]).get('desc'),
                                   'color': getattr(chicp_settings, 'stateLookup').get(parts[3]).get('color')})
                    else:
                        bp.append({'start': parts[1], 'end': parts[2], 'name': parts[3],
                                   'color': parts[8], 'sample': s, 'desc': parts[3]})
                bp = utils.makeRelative(int(segmin), int(segmax), ['start', 'end'], bp)
            bigbedData[s] = bp
    return bigbedData
