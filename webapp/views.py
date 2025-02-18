from django.shortcuts import render, get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Diagnostika, Subject, Question, Answer
from .serializers import QuestionSerializer, AnswerSerializer


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
    def post(self, request, diagnostika_id, *args, **kwargs):
        try:
            data = request.data
            subject1 = data.get("subject1")
            subject2 = data.get("subject2")

            if not subject1 or not subject2:
                return Response({"status": "error", "message": "Ikkita fan tanlanishi kerak!"}, status=400)

            # **1-Fan uchun testlar**
            questions_subject1 = Question.objects.filter(
                diagnostika_id=diagnostika_id, subject__name=subject1, is_mandatory=False
            ).order_by('?')[:30]  # ❗ 30 ta tasodifiy test

            # **2-Fan uchun testlar**
            questions_subject2 = Question.objects.filter(
                diagnostika_id=diagnostika_id, subject__name=subject2, is_mandatory=False
            ).order_by('?')[:30]  # ❗ 30 ta tasodifiy test

            # **Majburiy fanlar uchun testlar**
            compulsory_subjects = ["Ona tili", "Tarix", "Matematika"]
            compulsory_questions = Question.objects.filter(
                diagnostika_id=diagnostika_id, subject__name__in=compulsory_subjects, is_mandatory=True
            ).order_by("subject__name")

            # **Barcha savollarni olish va ularning javoblarini qo‘shish**
            all_questions = []

            def format_questions(title, question_list):
                """Har bir fan uchun nomini va testlarini chiqarish"""
                if question_list:
                    all_questions.append({"subject_name": title, "questions": []})
                    for question in question_list:
                        question_data = QuestionSerializer(question).data
                        answers = Answer.objects.filter(question_id=question.id)
                        question_data["answers"] = AnswerSerializer(answers, many=True).data
                        all_questions[-1]["questions"].append(question_data)

            format_questions(subject1, questions_subject1)
            format_questions(subject2, questions_subject2)

            for subject in compulsory_subjects:
                questions = compulsory_questions.filter(subject__name=subject)
                format_questions(subject, questions)

            return Response({"status": "success", "questions": all_questions}, status=200)

        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)
