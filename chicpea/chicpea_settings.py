from collections import OrderedDict

''' details of all snp tracks and configuration for elastic indicies '''
CHICP_IDX = OrderedDict([
    ('userdata', {'NAME': 'User Data', 'INDEX': 'cp:hg19_userdata_bed', 'TRACKS':
                  OrderedDict([
                               ])
                  }
     ),
    ('ic', {'NAME': 'ImmunoChip', 'INDEX': 'idx_name', 'TRACKS':
            OrderedDict([
                         ])
            }
     ),
    ('gwas', {'NAME': 'GWAS Statistics', 'INDEX': 'idx_name', 'TRACKS':
              OrderedDict([
                         ])
              }
     ),
    ('pmi', {'NAME': 'PMI Data', 'INDEX': 'idx_name', 'TRACKS':
             OrderedDict([
                          ])
             }
     )
    ])

sampleLookup = {}

DEFAULT_TARGET = ''
DEFAULT_TISSUE = ''
DEFAULT_TRACK = ''

TARGET_IDXS = {}
