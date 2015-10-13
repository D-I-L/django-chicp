from collections import OrderedDict

''' details of all snp tracks and configuration for elastic indicies for snp track '''
CHICP_IDX = OrderedDict([
    ('userdata', {'NAME': 'User Data', 'INDEX': 'cp:hg19_userdata_bed', 'DATA_TYPE': 'log10p', 'TRACKS':
                  OrderedDict([
                               ])
                  }
     ),
    ('ic', {'NAME': 'ImmunoChip', 'INDEX': 'idx_name', 'DATA_TYPE': 'log10p', 'TRACKS':
            OrderedDict([
                         ])
            }
     ),
    ('gwas', {'NAME': 'GWAS Statistics', 'INDEX': 'cp:hg19_gwas_bed', 'DATA_TYPE': 'log10p', 'TRACKS':
              OrderedDict([
                           ('gwas-barrett', {'NAME': 'T1D - Barrett et al.', 'TYPE': 't1d_barrett'}),
                         ])
              }
     ),
    ('pmi', {'NAME': 'PMI Data', 'INDEX': 'idx_name', 'DATA_TYPE': 'ppi', 'TRACKS':
             OrderedDict([
                          ])
             }
     )
    ])

sampleLookup = {}

stateLookup = {}

DEFAULT_TARGET = 'cp:hg19_mifsud_chicago_pm'
DEFAULT_TISSUE = 'CD34'
DEFAULT_TRACK = 'gwas-barrett'
DEFAULT_FRAG = 'hg19_restriction_sites/hindiii'
CP_GENE_IDX = 'cp:hg19_gene_details'

TARGET_IDXS = {'cp:hg19_mifsud_chicago_pm': 'Mifsud'}

STUDY_DEFAULTS = {'log10p': {'min': 1, 'snpCutoff': 7.03, 'score_text': "P Value (-log10)"},
                  'ppi': {'min': 0.001, 'snpCutoff': 0.1, 'score_text': "PPI Score"}}

ELASTIC = {
    'default': {
        'ELASTIC_URL': ['http://127.0.0.1:9200/'],
        'IDX': {
            'CP_STATS_UD': {
                'name': 'cp:hg19_userdata_bed',
                'label': 'User Data',
                'idx_type': {},
                'auth_public': True,
                },
            'CP_STATS_IC': {
                'name': 'cp:hg19_immunochip_bed',
                'label': 'ImmunoChip',
                'idx_type': {
                    'IC-ATD_COOPER': {'label': "ATD - Cooper et al.", 'type': 'atd_cooper', 'auth_public': True},
                    'IC-CEL_TRYNKA': {'label': "CEL - Trynka et al.", 'type': 'cel_trynka', 'auth_public': True},
                    'IC-JIA_HINKS_UK': {'label': "JIA - Hinks et al. UK", 'type': 'jia_hinks_uk'},
                    'IC-MS_IMSGC': {'label': "MS - IMSGC et al.", 'type': 'ms_imsgc'},
                    'IC-NAR_FARACO': {'label': "NAR - Faraco et al.", 'type': 'nar_faraco'},
                    'IC-PBC_LIU': {'label': "PBC - Liu et al.", 'type': 'pbc_liu', 'auth_public': True},
                    'IC-RA_EYRE': {'label': "RA - Eyre et al.", 'type': 'ra_eyre', 'auth_public': True},
                    'IC-T1D_ONENGUT': {'label': 'T1D - Onengut et al.', 'type': 't1d_onengut', 'auth_public': True},
                },
                'auth_public': True,
            },
            'CP_STATS_GWAS': {
                'name': 'cp:hg19_gwas_bed',
                'label': 'GWAS Statistic',
                'idx_type': {
                    'GWAS-DUBOIS': {'label': 'CEL - Dubois et al.', 'type': 'cel_dubois',
                                    'auth_public': True},
                    'GWAS-FRANKE': {'label': 'CRO - Franke et al.', 'type': 'cro_franke',
                                    'auth_public': True},
                    'GWAS-IMSGC': {'label': 'MS - IMSGC et al.', 'type': 'ms_imsgc',
                                   'auth_public': True},
                    'GWAS-OKADA': {'label': 'RA - Okada et al.', 'type': 'ra_okada'},
                    'GWAS-STAHL': {'label': 'RA - Stahl et al.', 'type': 'ra_stahl'},
                    'GWAS-BARRETT': {'label': 'T1D - Barrett et al.', 'type': 't1d_barrett'},
                    'GWAS-COOPER': {'label': 'T1D - Cooper et al.', 'type': 't1d_cooper',
                                    'auth_public': True},
                    'GWAS-ANDERSON': {'label': 'UC - Anderson et al.', 'type': 'uc_anderson'},
                },
                'auth_public': True,
            },
            'TARGET_CHICAGO': {'name': 'cp:hg19_chicago_targets', 'label': 'CHICAGO',
                               'auth_public': True, },
            'TARGET_MIFSUD': {'name': 'cp:hg19_mifsud_gt_pm', 'label': 'Mifsud et al.', },
            'TARGET_MARTIN': {'name': 'cp:hg19_martin_pm', 'label': 'Martin et al.',
                              'auth_public': True, },
        },
        'TEST': 'auto_tests',
        'REPOSITORY': 'my_backup',
    }
}

