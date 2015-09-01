from django.conf.urls import patterns, url
from chicpea import views

urlpatterns = patterns('',
                       url(r'^$', views.chicpea, name='chicpea'),
                       url(r'^docs$', views.chicpeaDocs, name='chicpeaDocs'),
                       url(r'^search(.*)$', views.chicpeaSearch, name='chicpeaSearch'),
                       url(r'^subSearch(.*)$', views.chicpeaSubSearch, name='chicpeaSubSearch'),
                       url(r'^fileUpload(.*)$', views.chicpeaFileUpload, name='chicpeaFileUpload'),
                       url(r'^download(.*)$', views.chicpeaDownload, name='chicpeaDownload'),
                       url(r'^deleteUserData(.*)$', views.chicpeaDeleteUD, name='chicpeaDeleteUD'),
                       )
