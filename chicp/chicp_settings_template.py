CP_STATS = ['UD', 'GWAS']
CP_TARGET = ['MIFSUD']

sampleLookup = {}

stateLookup = {}

DEFAULT_TARGET = 'MIFSUD'
DEFAULT_TISSUE = 'GM12878'
DEFAULT_TRACK = 'gwas-barrett'
DEFAULT_FRAG = 'hg19_restriction_sites/hindiii'
CP_GENE_IDX = 'cp:hg19_gene_details'
DEFAULT_GENES = ['IL2RA', 'DEXI', 'BACH2', 'FOXP3', 'DOCK1']

STUDY_DEFAULTS = {'log10p': {'min': 1, 'snpCutoff': 7.03, 'score_text': "P Value (-log10)"},
                  'ppi': {'min': 0.001, 'snpCutoff': 0.1, 'score_text': "PPI Score"}}
