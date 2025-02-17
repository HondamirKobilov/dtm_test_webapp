from django.shortcuts import render, get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Diagnostika, Subject, Question
from .serializers import QuestionSerializer


def home(request):
    diagnostikalar = Diagnostika.objects.all().order_by('-created_at')
    return render(request, 'index.html', {"diagnostikalar": diagnostikalar})

class DiagnostikaListAPIView(APIView):
    def get(self, request, *args, **kwargs):
        try:
            diagnostikalar = Diagnostika.objects.all().order_by('-created_at')
            diagnostika_list = []

            print("\n--- Diagnostika Ma'lumotlari ---")
            for diagnostika in diagnostikalar:
                diagnostika_data = {
                    "id": diagnostika.id,
                    "name": diagnostika.name,
                    "created_at": diagnostika.created_at.strftime('%Y-%m-%d %H:%M'),
                    "users_count": diagnostika.users.count()
                }
                diagnostika_list.append(diagnostika_data)
                print(f"ID: {diagnostika_data['id']}, "
                      f"Nomi: {diagnostika_data['name']}, "
                      f"Yaratilgan: {diagnostika_data['created_at']}, "
                      f"Userlar soni: {diagnostika_data['users_count']}")

            return Response({"status": "success", "diagnostikalar": diagnostika_list}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Xatolik: {str(e)}")
            return Response(
                {"status": "error", "message": f"Xatolik: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SubjectListAPIView(APIView):
    def get(self, request, *args, **kwargs):
        subjects = Subject.objects.all().order_by('name')
        subjects_list = [{"id": subject.id, "name": subject.name} for subject in subjects]
        return Response({"status": "success", "subjects": subjects_list}, status=status.HTTP_200_OK)


class DiagnostikaTestAPIView(APIView):
    def get(self, request, diagnostika_id, *args, **kwargs):
        diagnostika = get_object_or_404(Diagnostika, id=diagnostika_id)
        questions = Question.objects.filter(diagnostika=diagnostika).order_by('id')

        serializer = QuestionSerializer(questions, many=True)
        return Response({"status": "success", "questions": serializer.data}, status=200)