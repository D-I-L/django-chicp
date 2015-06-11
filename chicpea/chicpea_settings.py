from collections import OrderedDict

''' details of all snp tracks and configuration for elastic indicies '''
CHICP_IDX = OrderedDict([
    ('ic', {'NAME': 'ImmunoChip', 'INDEX': 'cp:hg19_immunochip_bed', 'TRACKS':
            OrderedDict([
                         ('ic-atd_cooper', {'NAME': "ATD - Cooper et al.", 'TYPE': 'atd_cooper'}),
                         ('ic-cel_trynka', {'NAME': "CEL - Trynka et al.", 'TYPE': 'cel_trynka'}),
                         ('ic-jia_hinks_uk', {'NAME': "JIA - Hinks et al. (UK)", 'TYPE': 'jia_hinks_uk'}),
                         ('ic-ms_imsgc', {'NAME': "MS - IMSGC et al.", 'TYPE': 'ms_imsgc'}),
                         ('ic-nar_faraco', {'NAME': "NAR - Faraco et al.", 'TYPE': 'nar_faraco'}),
                         ('ic-pbc_liu', {'NAME': "PBC - Liu et al.", 'TYPE': 'pbc_liu'}),
                         ('ic-ra_eyre', {'NAME': "RA - Eyre et al.", 'TYPE': 'ra_eyre'}),
                         ('ic-t1d_onengut', {'NAME': 'T1D - Onengut et al.', 'TYPE': 't1d_onengut'}),
                         ])
            }
     ),
    ('gwas', {'NAME': 'GWAS Statistics', 'INDEX': 'cp:hg19_gwas_bed', 'TRACKS':
              OrderedDict([
                         ('gwas-barrett', {'NAME': 'T1D - Barrett et al.', 'TYPE': 't1d_barrett'}),
                         ('gwas-cooper', {'NAME': 'T1D - Cooper et al.', 'TYPE': 't1d_cooper'}),
                         ])
              }
     ),
    ('pmi', {'NAME': 'PMI Data', 'INDEX': 'cp:hg19_pmidata_bed', 'TRACKS':
             OrderedDict([
                          ('pmi-bp_diastolic', {'NAME': 'Diastolic Blood Pressure', 'TYPE': 'pmi_bp_diastolic'}),
                          ('pmi-bp_systolic', {'NAME': 'Systolic Blood Pressure', 'TYPE': 'pmi_bp_systolic'}),
                          ('pmi-cel', {'NAME': 'Celiac Disease', 'TYPE': 'pmi_cel'}),
                          ('pmi-cro', {'NAME': "Crohn's Disease", 'TYPE': 'pmi_cro'}),
                          ('pmi-hb', {'NAME': "Haemoglobin", 'TYPE': 'pmi_hb'}),
                          ('pmi-height', {'NAME': "Height", 'TYPE': 'pmi_height'}),
                          ('pmi-mchc', {'NAME': "Mean Corpuscular Haemoglobin Concentration", 'TYPE': 'pmi_mchc'}),
                          ('pmi-mch', {'NAME': "Mean Corpuscular Haemoglobin", 'TYPE': 'pmi_mch'}),
                          ('pmi-mcv', {'NAME': " Mean Corpuscular Volume", 'TYPE': 'pmi_mcv'}),
                          ('pmi-ms', {'NAME': "Multiple Sclerosis", 'TYPE': 'pmi_ms'}),
                          ('pmi-pcv', {'NAME': "Packed Cell Volume/Haematocrit", 'TYPE': 'pmi_pcv'}),
                          ('pmi-plt', {'NAME': "Platelet Count", 'TYPE': 'pmi_plt'}),
                          ('pmi-pv', {'NAME': "Platelet Volume", 'TYPE': 'pmi_pv'}),
                          ('pmi-ra', {'NAME': "Rheumatoid Arthritis", 'TYPE': 'pmi_ra'}),
                          ('pmi-rbc', {'NAME': "Red Blood Cells", 'TYPE': 'pmi_rbc'}),
                          ('pmi-t1d', {'NAME': "Type 1 Diabetes", 'TYPE': 'pmi_t1d'}),
                          ('pmi-t2d', {'NAME': "Type 2 Diabetes", 'TYPE': 'pmi_t2d'}),
                          ('pmi-uc', {'NAME': "Ulcerative Colitis", 'TYPE': 'pmi_uc'}),
                          ])
             }
     )
    ])

TARGET_IDX = 'cp:hg19_mifsud_gt_pm'
# TARGET_IDX = 'chicpea_gene_target'
