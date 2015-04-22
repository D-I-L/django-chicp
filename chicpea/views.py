import io
import os
import re
from svgutils.templates import VerticalLayout, ColumnLayout
from svgutils.transform import fromstring
from tempfile import NamedTemporaryFile

from django.http.response import JsonResponse, HttpResponse
from django.shortcuts import render

from chicpea import utils
from search.elastic_model import Elastic


# Create your views here.
def chicpea(request):
    queryDict = request.GET
    context = dict()
    context['geneName'] = 'IL2RA'
    context['tissue'] = 'CD4_Activated'
    if queryDict.get("gene"):
        context['geneName'] = queryDict.get("gene")
    if queryDict.get("tissue"):
        context['tissue'] = queryDict.get("tissue")

    elasticJSON = Elastic(db="gene_targets").get_mapping(mapping_type="gene_target")
    tissueList = list(elasticJSON['gene_targets']['mappings']['gene_target']['_meta']['tissue_type'].keys())
    utils.tissues = tissueList
    tissues = list()
    tissueList.sort()
    for t in tissueList:
        tissues.append({"value": t, "text": t.replace("_", " ")})
    context['allTissues'] = tissues
    return render(request, 'chicpea/index.html', context, content_type='text/html')


def chicpeaSearch(request, url):
    queryDict = request.GET
    tissue = queryDict.get("tissue")
    # blueprint = []
    blueprint = {}

    if queryDict.get("region"):
        region = queryDict.get("region")
        mo = re.match(r"(\d+):(\d+)-(\d+)", region)
        (chrom, segmin, segmax) = mo.group(1, 2, 3)
        hic = []
        if utils.sampleLookup.get(tissue):
            for s in utils.sampleLookup.get(tissue):
                print(s)
                bp = []
                inFile = "/tmp/"+s+".bb"
                if (os.path.exists(inFile)):
                    outFile = NamedTemporaryFile(delete=False)
                    os.system("bigBedToBed "+inFile+" "+str(outFile.name)+" -chrom=chr"+chrom+" -start="+segmin+" -end="+segmax)
                    with open(str(outFile.name)) as f:
                        for line in f:
                            parts = re.split(r'\t+', line.rstrip('\n'))
                            bp.append({'start': parts[1], 'end': parts[2], 'name': parts[3], 'color': parts[8], 'sample': s})
                    bp = utils.makeRelative(int(segmin), int(segmax), ['start', 'end'], bp)
                blueprint[s] = bp
    else:
        # tissue = queryDict.get("tissue")
        geneName = queryDict.get("gene")

        hicQuery = utils.prepareTargetQueryJson2(geneName, utils.tissues, utils.hicFields)
        hicElastic = Elastic(query=hicQuery, search_from=0, size=2000000, db='gene_targets')
        hicResult = hicElastic.get_result()
        hic = hicResult['data']

        chrom = hicResult['data'][0]['baitChr']
        (segmin, segmax) = utils.segCoords(hic)
        extension = int(0.05*(segmax-segmin))
        segmin = segmin - extension
        segmax = segmax + extension
        hic = utils.makeRelative(int(segmin), int(segmax), ['baitStart', 'baitEnd', 'oeStart', 'oeEnd'], hic)

    # get genes based on this segment
    geneQuery = Elastic.range_overlap_query(seqid=chrom, start_range=segmin, end_range=segmax, search_from=0,
                                            size=2000, db='grch37_75_genes', field_list=utils.geneFields)
    geneResult = geneQuery.get_result()
    genes = geneResult['data']
    genes = utils.makeRelative(int(segmin), int(segmax), ['start', 'end'], genes)
    genes = [utils.flattenAttr(o) for o in genes]
    for o in genes:
        o.update({"bumpLevel": 0})

    # get SNPs based on this segment
    snpQuery = Elastic.range_overlap_query(seqid=chrom, start_range=segmin, end_range=segmax, search_from=0,
                                           size=2000000, db='gb2_hg19_gwas_t1d_barrett_4_17_0/gff',
                                           field_list=utils.snpFields)
    snpResult = snpQuery.get_result()
    snps = snpResult['data']
    snps = utils.makeRelative(int(segmin), int(segmax), ['start', 'end'], snps)
    snps = [utils.flattenAttr(o) for o in snps]

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
               "blueprint": blueprint
               }

    response = JsonResponse(retJSON)
    return response


def chicpeaDownload(request, url):
    queryDict = request.POST
    output_format = queryDict.get("output_format")
    SVG = queryDict.get("data-main")
    CSS = queryDict.get("css-styles")
    tissue = queryDict.get("tissue").replace(' ', '_')
    returnFileName = 'CHICPEA-' + queryDict.get("geneName") + '-' + tissue + '.' + output_format

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

    SVG = SVG.replace("</svg>", '<defs><style type="text/css">'+CSS+'</style></defs></svg>')

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