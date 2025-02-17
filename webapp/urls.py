from django.urls import path
from .views import home, DiagnostikaListAPIView, SubjectListAPIView, DiagnostikaTestAPIView

urlpatterns = [
    path('', home, name='home'),
    path('api/diagnostikas/', DiagnostikaListAPIView.as_view(), name='get_diagnostikas'),
    path('api/subjects/', SubjectListAPIView.as_view(), name='get_subjects'),
    path('api/diagnostikas/<int:diagnostika_id>/tests/', DiagnostikaTestAPIView.as_view(), name='diagnostika_tests'),
]
