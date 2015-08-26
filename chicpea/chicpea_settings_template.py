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
                           ('gwas-barrett', {'NAME': 'T1D - Barrett et al.', 'TYPE': 't1d_barrett'}),
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

stateLookup = {}

DEFAULT_TARGET = 'cp:hg19_mifsud_gt_pm'
DEFAULT_TISSUE = 'CD34'
DEFAULT_TRACK = 'gwas-barrett'
DEFAULT_FRAG = 'hg19_restriction_sites/hindiii'
CP_GENE_IDX = 'cp:hg19_gene_details'

TARGET_IDXS = {'cp:hg19_mifsud_gt_pm': 'Mifsud'}
