import os
from setuptools import setup, find_packages

# with open(os.path.join(os.path.dirname(__file__), 'README.rst')) as readme:
#     README = readme.read()

# allow setup.py to be run from any path
os.chdir(os.path.normpath(os.path.join(os.path.abspath(__file__), os.pardir)))
ROOT = os.path.abspath(os.path.dirname(__file__))

setup(
    name='chicpea',
    version='0.1a1',
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    url='http://github.com/D-I-L/django-chicpea',
    description='A Django app to visualise HiC interactions.',
    long_description=open(os.path.join(ROOT, 'README.md')).read(),
    install_requires=["Django>=1.8"],
    classifiers=[
        'Environment :: Web Environment',
        'Framework :: Django',
        'Intended Audience :: Developers',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Programming Language :: Python :: 3.4',
        'Topic :: Internet :: WWW/HTTP',
        'Topic :: Internet :: WWW/HTTP :: Dynamic Content',
    ],
)
