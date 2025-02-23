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


class CheckAnswersAPIView(APIView):
    def post(self, request, *args, **kwargs):
        try:
            data = request.data
            answers = data.get("answers", [])
            total_questions = data.get("total_questions", 0)

            if not total_questions:
                return Response({"status": "error", "message": "Savollar soni yetishmayapti!"}, status=400)

            # ✅ Har bir fan uchun to‘g‘ri javoblar sonini alohida hisoblaymiz
            correct_count_1 = 0  # 1-fan
            correct_count_2 = 0  # 2-fan
            correct_count_mandatory = 0  # Majburiy fanlar

            for answer in answers:
                answer_id = answer["answer_id"]
                order_number = answer.get("order_number")  # 📌 Testning tartib raqamini olish

                # 📌 Foydalanuvchi tanlagan variantni bazadan topamiz
                selected_answer = Answer.objects.filter(id=answer_id).first()

                if selected_answer and selected_answer.is_correct:
                    # 📌 Tartib raqam asosida fanlarni ajratamiz
                    if 1 <= order_number <= 30:
                        correct_count_1 += 1  # 1-fan (3.1 ball)
                    elif 31 <= order_number <= 60:
                        correct_count_2 += 1  # 2-fan (2.1 ball)
                    elif 61 <= order_number <= 90:
                        correct_count_mandatory += 1  # Majburiy fanlar (1.1 ball)

            incorrect_count = total_questions - (correct_count_1 + correct_count_2 + correct_count_mandatory)

            # 📌 Ballarni hisoblash
            score_1 = round(correct_count_1 * 3.1, 1)
            score_2 = round(correct_count_2 * 2.1, 1)
            score_mandatory = round(correct_count_mandatory * 1.1, 1)

            total_score = round(score_1 + score_2 + score_mandatory, 1)

            # 📌 Foizni hisoblash
            percentage = round(((correct_count_1 + correct_count_2 + correct_count_mandatory) / total_questions) * 100, 1) if total_questions > 0 else 0

            return Response({
                "status": "success",
                "correct_count": correct_count_1 + correct_count_2 + correct_count_mandatory,
                "incorrect_count": incorrect_count,
                "total_questions": total_questions,
                "percentage": percentage,
                "total_score": total_score,
                "subject_scores": {
                    "fan_1": {"correct": correct_count_1, "score": score_1},
                    "fan_2": {"correct": correct_count_2, "score": score_2},
                    "mandatory": {"correct": correct_count_mandatory, "score": score_mandatory},
                }
            }, status=200)

        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)



