CP_STATS = ['UD', 'IC', 'GWAS']
CP_TARGET = ['CHICAGO', 'MIFSUD', 'MARTIN']

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
                'name': '',
                'label': 'User Data',
                'idx_type': {},
                'data_type': 'log10p',
                },
            'CP_STATS_IC': {
                'name': '',
                'label': 'ImmunoChip',
                'idx_type': {
                },
                'data_type': 'log10p',
            },
            'CP_STATS_GWAS': {
                'name': '',
                'label': 'GWAS Statistic',
                'idx_type': {
                },
                'data_type': 'log10p',
            },
            'CP_TARGET_CHICAGO': {},
            'CP_TARGET_MIFSUD': {},
            'CP_TARGET_MARTIN': {},
        },
        'TEST': 'auto_tests',
        'REPOSITORY': 'my_backup',
    }
}
