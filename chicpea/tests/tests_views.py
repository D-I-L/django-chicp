from django.core.urlresolvers import resolve, reverse
from django.http.request import HttpRequest
from django.test import TestCase
from django.test.client import RequestFactory

from chicpea.views import chicpea, chicpeaSearch
from elastic.elastic_model import Search


class ChicpeaTestCase(TestCase):
    def setUp(self):
        # Every test needs access to the request factory.
        self.factory = RequestFactory()

    def test_page(self):
        ''' Test the main chicpea page. '''
        found = resolve('/chicpea/')
        self.assertEqual(found.func, chicpea)

    def test_page_returns_correct_html(self):
        ''' Test the content returned for the main chicpea page. '''
        request = self.factory.get('/')
        response = chicpea(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'IL2RA', response.content)

    def test_page_with_hgnc(self):
        ''' Test chicpea page with HGNC Gene name '''
        response = self.client.get(reverse('chicpea:chicpea') + '?gene=DEXI')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'chicpea/index.html')
        self.assertIn(b'DEXI', response.content)
        elasticJSON = Search(idx="chicpea_gene_target").get_mapping(mapping_type="gene_target")
        tissueList = list(elasticJSON['chicpea_gene_target']['mappings']['gene_target']['_meta']['tissue_type'].keys())
        for t in tissueList:
            self.assertIn(t.replace("_", " ").encode('ascii'), response.content)
        # self.assertEqual(resp.status_code, 200)
#         print(resp.context)
        # self.assertTrue('data' in resp.context)
        # snp = resp.context['data'][0]
        # self._SNPtest(snp)

    def test_page_with_ensg(self):
        ''' Test chicpea page with EnsEMBL Gene '''
        response = self.client.get(reverse('chicpea:chicpea') + '?gene=ENSG00000182108')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'chicpea/index.html')
        self.assertIn(b'ENSG00000182108', response.content)

    def test_page_with_geneerror(self):
        ''' Test chicpea page with EnsEMBL Gene '''
        geneName = 'ENSG00000'
        response = self.client.get(reverse('chicpea:chicpea') + '?gene='+geneName)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'chicpea/index.html')
        # str_error = 'Gene name '+geneName+' not found in this dataset'
        # self.assertIn(str_error.encode('ascii'), response.content)

    def test_search(self):
        ''' Test the chicpea search. '''
        found = resolve('/chicpea/search/')
        self.assertEqual(found.func, chicpeaSearch)

    def test_chicpeasearch_gene(self):
        ''' Test chicpea search for a gene & tissue '''
        geneName = 'ENS699'
        tissue = 'Monocytes'
        request = self.factory.get("/chicpea/search?gene="+geneName+"&tissue="+tissue)
        response = chicpeaSearch(request, "/chicpea/search?gene="+geneName+"&tissue="+tissue)
        print(response.content)

    def test_chicpeasearch_region(self):
        ''' Test chicpea search for a region '''
