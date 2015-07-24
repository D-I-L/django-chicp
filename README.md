=======
Chicpea
=======

Chicpea is a Django app to visualise HiC interactions.

Quick start
-----------

1. Installation

	pip install -e git://github.com/D-I-L/django-chicpea.git#egg=chicpea
	pip install --exists-action w -r $PYENV_HOME/src/chicpea/chicpea/requirements.txt 
	sed -i 's|from transform import|from svgutils.transform import|' $PYENV_HOME/src/svgutils/src/svgutils/templates.py

2. Add "chicpea" (and analytical for google analytics) to your INSTALLED_APPS setting like this::

    INSTALLED_APPS = (
        ...
        'chicpea',
    )

3. Include the chicpea URLconf in your project urls.py like this::

	url(r'^chicpea/', include('chicpea.urls', namespace="chicpea")),

4. Create a settings_secret.py in your django project and include it from settings.py.  Add details for ELASTIC search functionality like this::

	# elastic search engine
	ELASTIC = {
	    'default': {
	        'ELASTIC_URL': 'http://elastic:9200/',
	        'TEST': 'auto_tests',
	        'REPOSITORY': 'my_backup',
	    }
	}

5. Setup elastic indexes for all your data in chicpea_settings.py