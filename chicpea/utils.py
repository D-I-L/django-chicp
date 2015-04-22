''' Which fields to return for various elastic searches'''

# import json
import re


hicFields = ['ensg', 'baitEnd', 'baitStart', 'oeStart', 'oeEnd', 'oeID', 'baitID', 'baitChr', "name"]
geneFields = ['start', 'end', 'strand', 'attr.gene_name', 'attr.gene_biotype', 'attr.gene_id']
snpFields = ['start', 'end', 'score', 'attr.Name']
tissues = []
sampleLookup = {'Naive_CD4': ['C002Q1H1', 'C002TWH1', 'S007G7H4', 'S007DDH2'],
                'Megakaryocytes': ['S004BTH2'],
                'Erythroblasts': ['S002R5H1', 'S002S3H1'],
                'Monocytes': ['C000S5H2', 'C004SQH1'],
                'Macrophages_M0': ['S00390H1'],
                'Macrophages_M1': ['S001MJH1', 'S001S7H2', 'S0022IH2'],
                'Macrophages_M2': ['S00622H1', 'S006VIH1', 'S00BS4H1', 'S00FTNH1']}


def prepareTargetQueryJson(geneName, tissues, flist, maxDist=4e6):
    ''' this prepares a JSON string that can be use to query elastic search for interactions'''
    tissueFilter = list()
    for t in tissues:
        tissueFilter.append({"range": {t: {"gte": 5}}})

    qdata = {"_source": flist + tissues,
             "query": {"filtered":
                       {"query": {"match_all": {}},
                        "filter": {"bool":
                                   {"must":
                                    [{"or": [{"term": {"name": geneName}}, {"term": {"ensg": geneName}}]},
                                     {"range": {"dist": {"gte": -(maxDist/2), "lte": (maxDist/2)}}}
                                     ],
                                    "should": tissueFilter
                                    }}}
                       }
             }
    return(qdata)


def segCoords(lobj, coord_fields=['baitStart', 'baitEnd', 'oeStart', 'oeEnd']):
    '''given a list of objects lobj itergeneates over them and finds max and min'''
    ac = [int(f[n]) for f in lobj for n in coord_fields]
    return[min(ac), max(ac)]


def makeRelative(segstart, segend, coord_fields, coords):
    ''' segstart and segend are the max target/bait coords for the region
    this function makes coordinates of all submitted objects relative to a segment'''
    ret = []
    for f in coords:
        for n in coord_fields:
            coord = int(f[n]) - segstart + 1
            # print(coord)
            if(coord > 0):
                if(coord > (segend - segstart)):
                    f[n] = segend - segstart + 1
                else:
                    f[n] = coord
            else:
                f[n] = 1
        ret.append(f)
    return(ret)


def flattenAttr(obj):
    ''' function flattens GFF type objects returned from elastic search by iterating over attr value'''
    if(obj['attr']):
        for key, value in obj['attr'].items():
            # need this to remove protected \"
            obj[key] = re.sub("[\\][\"]", "", value)
        # remove attr
        return({key: value for key, value in obj.items() if key != 'attr'})
    return(obj)
