from collections import OrderedDict

''' details of all snp tracks and configuration for elastic indicies '''
CHICP_IDX = OrderedDict([
    ('userdata', {'NAME': 'User Data', 'INDEX': 'cp:hg19_userdata_bed', 'TRACKS':
                  OrderedDict([
                               ])
                  }
     ),
    ])

sampleLookup = {'}

DEFAULT_TARGET = ''
DEFAULT_TISSUE = ''
DEFAULT_TRACK = ''
DEFAULT_FRAG = ''
CP_GENE_IDX = ''

TARGET_IDXS = {}
