from django.urls import path
from .views import home, DiagnostikaListAPIView, SubjectListAPIView, DiagnostikaTestAPIView, CheckAnswersAPIView, \
    CheckUserResultAPIView, DiagnostikaResultsAPIView, DiagnostikaUsersCountAPIView, CheckDiagnostikaSubjectsAPIView, \
    TestAnalysisAPIView

urlpatterns = [
    path('', home, name='home'),
    path('api/diagnostikas/', DiagnostikaListAPIView.as_view(), name='get_diagnostikas'),
    path("api/check-user-result/", CheckUserResultAPIView.as_view(), name="check-user-result"),
    path('api/diagnostika-users-count/', DiagnostikaUsersCountAPIView.as_view(), name='diagnostika-users-count'),
    path('api/subjects/', SubjectListAPIView.as_view(), name='get_subjects'),
    path('api/diagnostikas/<int:diagnostika_id>/tests/', DiagnostikaTestAPIView.as_view(), name='diagnostika_tests'),
    path("api/check-answers/", CheckAnswersAPIView.as_view(), name="check-answers"),
    path("api/results/", DiagnostikaResultsAPIView.as_view(), name="diagnostika_results"),
    path("api/check-diagnostika-subjects/", CheckDiagnostikaSubjectsAPIView.as_view(), name="check-diagnostika-subjects"),
    path("api/test-analysis/", TestAnalysisAPIView.as_view(), name="test-analysis"),
]
