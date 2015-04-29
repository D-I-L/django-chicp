from django.core.urlresolvers import resolve
from django.http.request import HttpRequest
from django.test import TestCase

from chicpea.views import chicpea, chicpeaSearch


class ChicpeaTestCase(TestCase):

    def test_page(self):
        ''' Test the main chicpea page. '''
        found = resolve('/chicpea/')
        self.assertEqual(found.func, chicpea)

    def test_page_returns_correct_html(self):
        ''' Test the content returned for the main chicpea page. '''
        request = HttpRequest()
        response = chicpea(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'IL2RA', response.content)

    def test_search(self):
        ''' Test the chicpea search. '''
        found = resolve('/chicpea/search/')
        self.assertEqual(found.func, chicpeaSearch)
