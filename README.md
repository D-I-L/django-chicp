=======
Chicpea
=======

Chicpea is a Django app to visualise HiC interactions.

Quick start
-----------

1. Installation
pip install -e git://github.com/D-I-L/django-chicpea.git#egg=chicpea

2. Add "search" to your INSTALLED_APPS setting like this::

    INSTALLED_APPS = (
        ...
        'chicpea',
    )

3. Include the chicpea URLconf in your project urls.py like this::

  url(r'^chicpea/', include('chicpea.urls', namespace="chicpea")),
