import json

from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404
from rest_framework.status import HTTP_200_OK, HTTP_404_NOT_FOUND, HTTP_400_BAD_REQUEST
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Diagnostika, Subject, Question, Answer, User, Result, DiagnostikaSubjectAssociation
from .serializers import QuestionSerializer, AnswerSerializer
from django.utils.timezone import now

def home(request):
    diagnostikalar = Diagnostika.objects.all().order_by('-created_at')
    return render(request, 'index.html', {"diagnostikalar": diagnostikalar})

class DiagnostikaListAPIView(APIView):
    def get(self, request, *args, **kwargs):
        try:
            diagnostikalar = Diagnostika.objects.all().order_by('id')
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
class CheckUserResultAPIView(APIView):
    def get(self, request):
        user_id = request.GET.get("user_id")
        diagnostika_id = request.GET.get("diagnostika_id")

        if not user_id or not diagnostika_id:
            return Response({"error": "user_id va diagnostika_id talab qilinadi"}, status=400)
        diagnostika = get_object_or_404(Diagnostika, id=diagnostika_id)
        exists = Result.objects.filter(user__user_id=user_id, diagnostika__id=diagnostika_id).exists()
        print(diagnostika.name, " >>>", exists, diagnostika.status)
        return Response({
            "exists": exists,
            "status": diagnostika.status
        })
class SubjectListAPIView(APIView):
    def get(self, request, *args, **kwargs):
        subjects = Subject.objects.all().order_by('name')
        subjects_list = [{"id": subject.id, "name": subject.name} for subject in subjects]
        return Response({"status": "success", "subjects": subjects_list}, status=status.HTTP_200_OK)

class DiagnostikaUsersCountAPIView(APIView):
    def get(self, request):
        diagnostika_id = request.GET.get("diagnostika_id")

        if not diagnostika_id:
            return Response({"error": "diagnostika_id talab qilinadi"}, status=400)

        # **Foydalanuvchi ID larini noyob (unique) qilib sanash**
        unique_user_count = Result.objects.filter(diagnostika_id=diagnostika_id).values("user_id").distinct().count()

        return Response({"users_count": unique_user_count})
class DiagnostikaResultsAPIView(APIView):
    def get(self, request):
        diagnostika_id = request.GET.get("diagnostika_id")

        if not diagnostika_id:
            return Response({"error": "diagnostika_id berilmagan!"}, status=status.HTTP_400_BAD_REQUEST)

        # 1️⃣ Diagnostika ID orqali Result jadvalidan user_id larni olish
        results = Result.objects.filter(diagnostika_id=diagnostika_id)
        user_ids = results.values_list("user_id", flat=True)

        # if not user_ids:
        #     return Response({"error": "Natijalar topilmadi!"}, status=status.HTTP_404_NOT_FOUND)

        # 2️⃣ User ID lar orqali users jadvalidan fullname ustunini olish
        users = User.objects.filter(id__in=user_ids).values("id", "fullname")

        # 3️⃣ user_id -> fullname uchun dictionary hosil qilish
        user_dict = {user["id"]: {"fullname": user["fullname"], "phone": user["phone"]} for user in users}

        # 4️⃣ Yakuniy natijalar ro‘yxatini yaratish
        results_data = [
            {
                "participant": user_dict.get(r.user_id, {}).get("phone", "Telefon mavjud emas"),
                "full_name": user_dict.get(r.user_id, "Ism mavjud emas"),  # ✅ fullname olish
                "subject1_score": r.correct_answers_subject1,
                "subject1_name": r.subject1_name,
                "subject2_score": r.correct_answers_subject2,
                "subject2_name": r.subject2_name,
                "mandatory_score": r.correct_answers_mandatory,
                "total_score": r.total_score,
                "percentage": round((r.total_score / 200) * 100, 1),
                "completed_at": r.completed_at.strftime("%H:%M %d.%m.%Y"),  # ✅ TO‘G‘RI FORMATI
            }
            for r in results
        ]

        return Response({"results": results_data}, status=status.HTTP_200_OK)

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
            compulsory_subjects = ["Ona tili va adabiyot", "Tarix", "Matematika"]
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
            print("📌 Kelayotgan JSON ma'lumotlar:", json.dumps(data, indent=4))  # ✅ Log uchun
            user_id = data.get("user_id")
            diagnostika_id = data.get("diagnostika_id")
            subject1_name = data.get("subject1_name")
            subject2_name = data.get("subject2_name")
            answers = data.get("answers", [])
            total_questions = data.get("total_questions", 0)
            allQuestionIds = data.get("allQuestionIds")
            duration_time = data.get("duration_time", "00:00:00")

            if not total_questions or not diagnostika_id or not user_id:
                return Response({"status": "error", "message": "Ma'lumotlar yetarli emas!"}, status=400)

            # ✅ Foydalanuvchi va diagnostikani topamiz
            user = User.objects.filter(user_id=user_id).first()
            diagnostika = Diagnostika.objects.filter(id=diagnostika_id).first()

            if not user or not diagnostika:
                return Response({"status": "error", "message": "Foydalanuvchi yoki diagnostika topilmadi!"}, status=404)

            correct_count_1 = 0
            correct_count_2 = 0
            correct_count_mandatory = 0

            correct_answers = []  # ✅ To‘g‘ri javoblar ID lari
            wrong_answers = []  # ❌ Noto‘g‘ri javoblar ID lari

            for answer in answers:
                answer_id = answer["answer_id"]
                order_number = answer["order_number"]

                selected_answer = Answer.objects.filter(id=answer_id).first()
                if selected_answer:
                    if selected_answer.is_correct:
                        correct_answers.append(answer_id)  # ✅ To‘g‘ri javob
                        if 1 <= order_number <= 30:
                            correct_count_1 += 1
                        elif 31 <= order_number <= 60:
                            correct_count_2 += 1
                        elif 61 <= order_number <= 90:
                            correct_count_mandatory += 1
                    else:
                        wrong_answers.append(answer_id)  # ❌ Noto‘g‘ri javob

            incorrect_count = total_questions - (correct_count_1 + correct_count_2 + correct_count_mandatory)

            # ✅ Ballarni hisoblash
            score_1 = round(correct_count_1 * 3.1, 1)
            score_2 = round(correct_count_2 * 2.1, 1)
            score_mandatory = round(correct_count_mandatory * 1.1, 1)
            total_score = round(score_1 + score_2 + score_mandatory, 1)

            # ✅ Natijalarni bazaga saqlash
            Result.objects.create(
                diagnostika=diagnostika,
                user=user,
                subject1_name=subject1_name,
                subject2_name=subject2_name,
                correct_answers_subject1=correct_count_1,
                correct_answers_subject2=correct_count_2,
                correct_answers_mandatory=correct_count_mandatory,
                total_score=total_score,
                correct_answer_ids=correct_answers,  # ✅ JSONB formatda saqlash
                wrong_answer_ids=wrong_answers,  # ✅ JSONB formatda saqlash
                all_answer_ids=allQuestionIds,  # 🔵 Barcha ishlagan savollar JSONB formatda
                duration_time=duration_time,  # ⏳ Test vaqtini HH:MM:SS formatda saqlash
                completed_at=now()
            )

            return Response({
                "status": "success",
                "correct_count": correct_count_1 + correct_count_2 + correct_count_mandatory,
                "incorrect_count": incorrect_count,
                "total_questions": total_questions,
                "percentage": round(
                    ((correct_count_1 + correct_count_2 + correct_count_mandatory) / total_questions) * 100, 1),
                "duration_time": duration_time,  # ⏳ Testni bajargan vaqt (HH:MM:SS)
                "total_score": total_score,
                "correct_answer_ids": correct_answers,
                "wrong_answer_ids": wrong_answers,
                "all_answer_ids": allQuestionIds,  # 🔵 Yangi qo‘shilgan maydon
                "subject1_name": subject1_name,
                "subject2_name": subject2_name,
                "subject_scores": {
                    "fan_1": {"correct": correct_count_1, "score": score_1},
                    "fan_2": {"correct": correct_count_2, "score": score_2},
                    "mandatory": {"correct": correct_count_mandatory, "score": score_mandatory},
                }
            }, status=200)

        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)

class CheckDiagnostikaSubjectsAPIView(APIView):
    def get(self, request):
        diagnostika_id = request.GET.get("diagnostika_id")

        if not diagnostika_id:
            return JsonResponse({"error": "diagnostika_id talab qilinadi"}, status=400)

        # DiagnostikaSubjectAssociation orqali bog‘langan fanlarni olish
        subjects = Subject.objects.filter(
            id__in=DiagnostikaSubjectAssociation.objects.filter(
                diagnostika_id=diagnostika_id
            ).values_list("subject_id", flat=True)
        ).values("id", "name")

        # Agar hech qanday fan bog‘lanmagan bo‘lsa, bo‘sh ro‘yxat qaytariladi
        return JsonResponse({"subjects": list(subjects)})


class TestAnalysisAPIView(APIView):
    def get(self, request):
        user_id = request.GET.get("user_id")
        diagnostika_id = request.GET.get("diagnostika_id")

        if not user_id or not diagnostika_id:
            return Response({"status": "error", "message": "Ma'lumot yetarli emas!"}, status=HTTP_400_BAD_REQUEST)

        # ✅ User ID ni User modelidan olish
        user = User.objects.filter(user_id=user_id).first()
        if not user:
            return Response({"status": "error", "message": "Foydalanuvchi topilmadi!"}, status=HTTP_404_NOT_FOUND)

        # ✅ Foydalanuvchining natijasini olish
        result = Result.objects.filter(diagnostika_id=diagnostika_id, user=user).first()
        if not result:
            return Response({"status": "error", "message": "Natijalar topilmadi!"}, status=HTTP_404_NOT_FOUND)

        # ✅ Shu diagnostikaga ishtirok qilganlar soni
        participant_count = Result.objects.filter(diagnostika_id=diagnostika_id).count()

        # ✅ Ishlangan savollar ID'sini olish
        all_question_ids = result.all_answer_ids  # `{question_id: [answers]}`

        # ✅ Test tahlilini tayyorlash
        test_analysis = []
        for question_id, answer_order in all_question_ids.items():
            question = Question.objects.filter(id=question_id).first()
            if not question:
                continue

            # ✅ Foydalanuvchi tanlagan javob
            user_answer_id = next((a for a in result.correct_answer_ids + result.wrong_answer_ids if a in answer_order), None)

            # ✅ Savolga tegishli variantlarni chiqarish (to‘g‘ri tartibda)
            answers = Answer.objects.filter(id__in=answer_order)
            ordered_answers = sorted(answers, key=lambda x: answer_order.index(x.id))

            # ✅ Ma'lumotlarni ro‘yxatga qo‘shish
            test_analysis.append({
                "question_id": question.id,
                "question_text": question.question_text,
                "image": question.image,
                "answers": [
                    {
                        "id": answer.id,
                        "text": answer.text,
                        "is_correct": answer.is_correct
                    } for answer in ordered_answers
                ],
                "user_answer_id": user_answer_id,  # ✅ Belgilangan javob
                "correct_answer_id": next((a.id for a in ordered_answers if a.is_correct), None),
            })

        # ✅ `duration_time`, `participant_count`, `fan nomlari` ni JSON response'ga qo‘shamiz
        return Response({
            "status": "success",
            "duration_time": result.duration_time,  # ⏳ Test davomiyligi
            "participant_count": participant_count,  # 👥 Ishtirokchilar soni
            "subject1_name": result.subject1_name,  # 🎯 1-fan nomi
            "subject2_name": result.subject2_name,  # 🎯 2-fan nomi
            "mandatory_subject_name": "Majburiy fan",  # 🎯 Majburiy fan nomi (agar bazada yo‘q bo‘lsa statik qo‘yamiz)
            "test_analysis": test_analysis
        }, status=HTTP_200_OK)
