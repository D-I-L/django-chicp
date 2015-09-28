from django.core.urlresolvers import resolve, reverse
from django.test import TestCase
from django.test.client import RequestFactory

from chicp import chicp_settings
from chicp import utils
from chicp.views import chicpea, chicpeaSearch
from elastic.search import Search


class ChicpeaTestCase(TestCase):
    def setUp(self):
        # Every test needs access to the request factory.
        self.factory = RequestFactory()
        for idx in getattr(chicp_settings, 'TARGET_IDXS'):
            elasticJSON = Search(idx=idx).get_mapping(mapping_type="gene_target")
            tissueList = list(elasticJSON[idx]['mappings']['gene_target']['_meta']['tissue_type'].keys())
            utils.tissues[idx] = tissueList

    def test_page(self):
        ''' Test the main CHiCP page. '''
        found = resolve('/chicp/')
        self.assertEqual(found.func, chicpea)

    def test_page_returns_correct_html(self):
        ''' Test the content returned for the main CHiCP page. '''
        request = self.factory.get('/')
        response = chicpea(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'IL2RA', response.content)

    def test_page_with_hgnc(self):
        ''' Test CHiCP page with HGNC Gene name '''
        response = self.client.get(reverse('chicp:chicp') + '?term=DEXI')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'chicp/index.html')
        self.assertIn(b'DEXI', response.content)
        for idx in utils.tissues:
            tissueList = utils.tissues[idx]
            for t in tissueList:
                self.assertIn(t.replace("_", " ").encode('ascii'), response.content)

    def test_page_with_ensg(self):
        ''' Test CHiCP page with EnsEMBL Gene '''
        response = self.client.get(reverse('chicp:chicp') + '?term=ENSG00000182108')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'chicp/index.html')
        self.assertIn(b'ENSG00000182108', response.content)

    def test_page_with_geneerror(self):
        ''' Test CHiCP page with EnsEMBL Gene '''
        geneName = 'ENSG00000'
        response = self.client.get(reverse('chicp:chicp') + '?term='+geneName)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'chicp/index.html')

    def test_search(self):
        ''' Test the CHiCP search. '''
        found = resolve('/chicp/search/')
        self.assertEqual(found.func, chicpeaSearch)

    def test_chicpeasearch_gene(self):
        ''' Test CHiCP search for a gene & tissue '''
        geneName = 'IL2RA'
        targetIdx = 'cp:hg19_mifsud_chicago_pm'
        url = "/chicp/search?searchTerm="+geneName+"&targetIdx="+targetIdx+"&snp_track=gwas-barrett"
        request = self.factory.get(url)
        response = chicpeaSearch(request, url)
        self._HICtest(str(response.content, encoding='utf8'))

    def test_chicpeasearch_region(self):
        ''' Test CHiCP search for a region '''
        region = 'X:153043000-153390000'
        targetIdx = 'cp:hg19_mifsud_chicago_pm'
        url = "/chicp/search?searchTerm="+region+"&targetIdx="+targetIdx+"&snp_track=gwas-barrett"
        request = self.factory.get(url)
        response = chicpeaSearch(request, url)
        self._HICtest(str(response.content, encoding='utf8'))

    def test_chicpeasearch_snp(self):
        ''' Test CHiCP search for a gene & tissue '''
        snp = 'rs2476601'
        targetIdx = 'cp:hg19_mifsud_chicago_pm'
        url = "/chicp/search?searchTerm="+snp+"&targetIdx="+targetIdx+"&snp_track=gwas-barrett"
        request = self.factory.get(url)
        response = chicpeaSearch(request, url)
        self._HICtest(str(response.content, encoding='utf8'))

    def _HICtest(self, json):
        ''' Testing JSON respon from a chicpea search '''
        self.assertIn("hic", json)
        self.assertIn("snps", json)
        self.assertIn("genes", json)
        self.assertIn("blueprint", json)
        self.assertIn("meta", json)
        self.assertIn("region", json)
