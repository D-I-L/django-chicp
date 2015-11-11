=======
 CHiCP
=======

CHiCP is a Django app to visualise HiC interactions (www.chicp.org).

Quick start
-----------

1. Pre-Installation Requirements
	Cairo - http://cairographics.org

2. Installation
```bash
	pip install -e git://github.com/D-I-L/django-chicp.git#egg=chicp
	pip install --exists-action w -r $PYENV_HOME/src/chicp/chicp/requirements.txt 
	sed -i 's|from transform import|from svgutils.transform import|' $PYENV_HOME/src/svgutils/src/svgutils/templates.py
```

3. Add "chicpea" (and analytical for google analytics) to your INSTALLED_APPS setting like this::
```python
    INSTALLED_APPS = (
        ...
        'chicp',
    )
```

3. Include the chicp URLconf in your project urls.py like this::
```python
	url(r'^chicp/', include('chicp.urls', namespace="chicp")),
```

5. Create a settings_secret.py in your django project and include it from settings.py.  Add details for ELASTIC search functionality like this::
```python
	# elastic search engine
	ELASTIC = {
	    'default': {
	        'ELASTIC_URL': 'http://elastic:9200/',
	    }
	}
```

6. Setup elastic indexes for all your data in chicpea_settings.py
