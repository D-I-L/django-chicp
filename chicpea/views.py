import operator
import os
import re
from svgutils.templates import VerticalLayout, ColumnLayout
from svgutils.transform import fromstring
from tempfile import NamedTemporaryFile

from django.conf import settings
from django.http.response import JsonResponse, HttpResponse
from django.shortcuts import render

from chicpea import chicpea_settings
from chicpea import utils
from elastic.search import Search, ElasticQuery
from elastic.query import BoolQuery, Query, RangeQuery, Filter
from collections import OrderedDict


# Create your views here.
def chicpea(request):
    queryDict = request.GET
    context = dict()
    context['searchTerm'] = 'IL2RA'
    context['tissue'] = 'Total_CD4_Activated'
    if queryDict.get("term"):
        context['searchTerm'] = queryDict.get("term")
    if queryDict.get("tissue"):
        context['tissue'] = queryDict.get("tissue")

    elasticJSON = Search(idx=getattr(chicpea_settings, 'TARGET_IDX')).get_mapping(mapping_type="gene_target")
    tissueList = list(elasticJSON[getattr(chicpea_settings, 'TARGET_IDX')]['mappings']['gene_target']['_meta']['tissue_type'].keys())
    utils.tissues = tissueList
    tissues = list()
    tissueList.sort()
    for t in tissueList:
        tissues.append({"value": t, "text": t.replace("_", " ")})
    context['allTissues'] = tissues

    snpTracks = OrderedDict()
    defaultTrack = ''
    for group in getattr(chicpea_settings, 'CHICP_IDX'):
        snp_tracks = list()
        for track in getattr(chicpea_settings, 'CHICP_IDX').get(group).get('TRACKS'):
            snp_tracks.append({"value": track,
                               "text":  getattr(chicpea_settings, 'CHICP_IDX').get(group).get('TRACKS')
                               .get(track).get('NAME')})
            if defaultTrack == '':
                defaultTrack = getattr(chicpea_settings, 'CHICP_IDX').get(group).get('TRACKS').get(track).get('NAME')
        snpTracks[getattr(chicpea_settings, 'CHICP_IDX').get(group).get('NAME')] = snp_tracks
    context['snpTracks'] = snpTracks

    if queryDict.get("snp_track"):
        context['snp_track'] = queryDict.get("snp_track")
    else:
        context['snp_track'] = defaultTrack
        # context['snp_track'] = snp_tracks[0].get('value')

    return render(request, 'chicpea/index.html', context, content_type='text/html')


def chicpeaSearch(request, url):
    queryDict = request.GET
    tissue = queryDict.get("tissue")
    blueprint = {}
    hic = []
    addList = []

    if queryDict.get("region"):
        region = queryDict.get("region")
        mo = re.match(r"(.*):(\d+)-(\d+)", region)
        (chrom, segmin, segmax) = mo.group(1, 2, 3)

        query_bool = BoolQuery()
        query_bool.must([Query.term("baitChr", chrom),
                         Query.term("oeChr", chrom),
                         RangeQuery("dist", gte=-2e6, lte=2e6)])
        query_bool = _add_tissue_filter(query_bool)

        filter_bool = BoolQuery()
        filter_bool.should([BoolQuery(must_arr=[RangeQuery("baitStart", gte=segmin, lte=segmax),
                                                RangeQuery("baitEnd", gte=segmin, lte=segmax)]),
                            BoolQuery(must_arr=[RangeQuery("oeStart", gte=segmin, lte=segmax),
                                                RangeQuery("oeEnd", gte=segmin, lte=segmax)])])

        query = ElasticQuery.filtered_bool(query_bool, filter_bool,
                                           sources=utils.hicFields + utils.tissues)
        (hic) = _build_hic_query(query)

        if utils.sampleLookup.get(tissue):
            dataDir = os.path.join(settings.STATIC_ROOT, "chicpea/data/")
            for s in utils.sampleLookup.get(tissue):
                bp = []
                inFile = dataDir+s+".bb"
                if (os.path.exists(inFile)):
                    outFile = NamedTemporaryFile(delete=False)
                    os.system("bigBedToBed "+inFile+" "+str(outFile.name)+" -chrom=chr"+chrom+" -start="+segmin+" -end="+segmax)
                    with open(str(outFile.name)) as f:
                        for line in f:
                            parts = re.split(r'\t+', line.rstrip('\n'))
                            bp.append({'start': parts[1], 'end': parts[2], 'name': parts[3],
                                       'color': parts[8], 'sample': s})
                    bp = utils.makeRelative(int(segmin), int(segmax), ['start', 'end'], bp)
                blueprint[s] = bp
    elif queryDict.get("searchTerm"):
        if re.search("^rs[0-9]+", queryDict.get("searchTerm").lower()):
            snp = queryDict.get("searchTerm").lower()
            print("### "+snp)

            query = ElasticQuery.query_match("name", snp)
            mo = re.match(r"(.*)-(.*)", queryDict.get("snp_track"))
            (group) = mo.group(1)
            snp_track_idx = getattr(chicpea_settings, 'CHICP_IDX').get(group).get('INDEX')
            snp_track_type = getattr(chicpea_settings, 'CHICP_IDX').get(group).get('TRACKS') \
                .get(queryDict.get("snp_track")).get('TYPE')

            elastic = Search(query, idx=snp_track_idx+'/'+snp_track_type)
            # elastic = Search(query, idx='dbsnp138')
            snpResult = elastic.get_result()
            if (len(snpResult['data']) > 0):
                chrom = snpResult['data'][0]['seqid'].replace('chr', "")
                position = snpResult['data'][0]['end']

                addList.append({'chr': chrom, 'start': (position-1), 'end': position, 'name': snp})

                query_bool = BoolQuery()
                query_bool.must([Query.term("baitChr", chrom),
                                 Query.term("oeChr", chrom),
                                 RangeQuery("dist", gte=-2e6, lte=2e6)])
                query_bool = _add_tissue_filter(query_bool)

                filter_bool = BoolQuery()
                filter_bool.should([BoolQuery(must_arr=[RangeQuery("baitStart", lte=position),
                                                        RangeQuery("baitEnd", gte=position)]),
                                    BoolQuery(must_arr=[RangeQuery("oeStart", lte=position),
                                                        RangeQuery("oeEnd", gte=position)])])

                query = ElasticQuery.filtered_bool(query_bool, filter_bool,
                                                   sources=utils.hicFields + utils.tissues)
                hic, segmin, segmax = _build_hic_query(query)

                if len(hic) == 0:
                    retJSON = {'error': 'Marker '+snp+' not found in this dataset.'}
                    return JsonResponse(retJSON)
        else:
            geneName = queryDict.get("searchTerm").upper()

            query_bool = BoolQuery()
            query_bool.must([RangeQuery("dist", gte=-2e6, lte=2e6)])
            query_bool = _add_tissue_filter(query_bool)
            query = ElasticQuery.filtered_bool(Query.query_string(geneName, fields=["name", "ensg"]), query_bool,
                                               sources=utils.hicFields + utils.tissues)

            hic, segmin, segmax = _build_hic_query(query)

            if len(hic) == 0:
                retJSON = {'error': 'Gene name '+geneName+' not found in this dataset.'}
                return JsonResponse(retJSON)
            chrom = hic[0]['baitChr']

    try:
        chrom
    except NameError:
        retJSON = {'error': 'No chromosome defined for search'}
        return JsonResponse(retJSON)

    # get genes based on this segment
    geneQuery = Search.range_overlap_query(seqid=chrom, start_range=segmin, end_range=segmax, search_from=0,
                                           size=2000, idx='grch37_75_genes', field_list=utils.geneFields)
    geneResult = geneQuery.get_result()
    genes = geneResult['data']
    genes = utils.makeRelative(int(segmin), int(segmax), ['start', 'end'], genes)
    genes = [utils.flattenAttr(o) for o in genes]
    for o in genes:
        o.update({"bumpLevel": 0})
        o.update({"length": (o['end']-o['start'])})
    genes.sort(key=operator.itemgetter('length'))

    # get SNPs based on this segment
    mo = re.match(r"(.*)-(.*)", queryDict.get("snp_track"))
    (group) = mo.group(1)
    snp_track_idx = getattr(chicpea_settings, 'CHICP_IDX').get(group).get('INDEX')
    snp_track_type = getattr(chicpea_settings, 'CHICP_IDX').get(group).get('TRACKS') \
        .get(queryDict.get("snp_track")).get('TYPE')
    query = ElasticQuery.filtered(Query.terms("seqid", [chrom, str("chr"+chrom)]),
                                  Filter(RangeQuery("end", gte=segmin, lte=segmax)),
                                  utils.snpFields)
    snpQuery = Search(search_query=query, search_from=0, size=2000000, idx=snp_track_idx+'/'+snp_track_type)

    snpResult = snpQuery.get_result()
    snps = snpResult['data']
    snps = utils.makeRelative(int(segmin), int(segmax), ['start', 'end'], snps)
    addList = utils.makeRelative(int(segmin), int(segmax), ['start', 'end'], addList)

    # print(snps)
    retJSON = {"hic": hic,
               "meta": {"ostart": int(segmin),
                        "oend": int(segmax),
                        "rstart": 1,
                        "rend": int(segmax) - int(segmin),
                        "rchr": str(chrom),
                        "tissues": utils.tissues},
               "snps": snps,
               "genes": genes,
               "region": str(chrom) + ":" + str(segmin) + "-" + str(segmax),
               "blueprint": blueprint,
               "extra": addList
               }

    response = JsonResponse(retJSON)
    return response


def chicpeaDownload(request, url):
    queryDict = request.POST
    output_format = queryDict.get("output_format")
    SVG = queryDict.get("data-main")
    CSS = queryDict.get("css-styles")
    tissue = queryDict.get("tissue").replace(' ', '_')
    returnFileName = 'CHICPEA-' + queryDict.get("searchTerm") + '-' + tissue + '.' + output_format

    # f1 = fromstring(SVG)
    # f1.set_size([750, 750])
    # print(f1.get_size())

    if queryDict.get("data-bait") and queryDict.get("data-target"):
        s1 = queryDict.get("data-bait")
        s2 = queryDict.get("data-target")
        layoutPanels = VerticalLayout()
        layoutPanels.add_figure(fromstring(s1))
        layoutPanels.add_figure(fromstring(s2))
        layoutPanels._generate_layout()
        svgPanels = layoutPanels.to_str()

        fig1 = fromstring(queryDict.get("data-main"))
        layout = ColumnLayout(1)
        layout.add_figure(fig1)
        layout.add_figure(fromstring(svgPanels))
        layout._generate_layout()
        SVG = layout.to_str().decode()

    SVG = SVG.replace('<svg ', '<svg style="padding:40px;" ')
    SVG = SVG.replace("</svg>",
                      '<defs><style type="text/css">'+CSS+'</style></defs></svg>')

    if output_format == "svg":
        response = HttpResponse(content_type='image/svg+xml')
        response['Content-Disposition'] = 'attachment; filename="' + returnFileName + '"'
        response.write(SVG)
    elif output_format == "pdf" or output_format == "png":
        mime_type = "application/x-pdf" if output_format == "pdf" else "image/png"
        zoom = '10' if output_format == "png" else '1'

        response = HttpResponse(content_type=mime_type)
        response['Content-Disposition'] = 'attachment; filename="' + returnFileName + '"'
        iFile = NamedTemporaryFile(delete=False)
        oFile = NamedTemporaryFile(delete=False)
        iFile.write(SVG.encode())
        iFile.close()
        os.system("rsvg-convert -o '" + str(oFile.name) + "' -z '" + zoom + "' -f '"
                  + output_format + "' '" + str(iFile.name) + "'")
        pdfData = oFile.read()
        response.write(pdfData)
    else:
        retJSON = {"error": "output format was not recognised"}
        response = JsonResponse(retJSON)
    return response


def _add_tissue_filter(bool_query):

    tissueFilter = list()
    for t in utils.tissues:
        tissueFilter.append(RangeQuery(t, gte=5))

    bool_query.should(tissueFilter)
    return bool_query


def _build_hic_query(query):

    hic = []
    segmin = 0
    segmax = 0

    hicElastic = Search(query, idx=getattr(chicpea_settings, 'TARGET_IDX'), search_from=0, size=2000)
    hicResult = hicElastic.get_result()
    if len(hicResult['data']) > 0:
        hic = hicResult['data']
        (segmin, segmax) = utils.segCoords(hic)
        extension = int(0.05*(segmax-segmin))
        segmin = segmin - extension
        segmax = segmax + extension
        hic = utils.makeRelative(int(segmin), int(segmax), ['baitStart', 'baitEnd', 'oeStart', 'oeEnd'], hic)
    return hic, segmin, segmax
