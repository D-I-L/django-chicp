from django.test import TestCase
from django.core.urlresolvers import reverse


class ChicpeaTestCase(TestCase):

    def test_page(self):
        ''' Test the main chicpea page. '''
        resp = self.client.get(reverse('chicpea'))
        self.assertEqual(resp.status_code, 200)
        # check we've used the right template
        self.assertTemplateUsed(resp, 'chicpea/index.html')
