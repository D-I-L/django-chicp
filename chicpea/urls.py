from django.conf.urls import patterns, url
from chicpea import views

urlpatterns = patterns('',
                       url(r'^$', views.chicpea, name='chicpea'),
                       url(r'^search(.*)$', views.chicpeaSearch, name='chicpeaSearch'),
                       url(r'^download(.*)$', views.chicpeaDownload, name='chicpeaDownload'),
                       )