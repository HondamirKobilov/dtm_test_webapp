from django.db import models
from django.utils.timezone import now


class User(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField(unique=True)
    language = models.CharField(max_length=2, default="uz")
    fullname = models.CharField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    region = models.IntegerField(null=True, blank=True)
    district = models.IntegerField(null=True, blank=True)
    username = models.CharField(max_length=255, unique=True, null=True, blank=True)
    is_blocked = models.BooleanField(default=False)
    is_premium = models.BooleanField(default=False)
    referral_count = models.IntegerField(null=False, default=0)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "users"

    def __str__(self):
        return self.fullname if self.fullname else f"User {self.user_id}"


class ReferralCount(models.Model):
    id = models.BigAutoField(primary_key=True)  # ✅ id ustuni (optional, Django defaultda baribir yaratadi)
    count = models.IntegerField(default=0)

    class Meta:
        db_table = 'ref_count'  # PostgreSQL yoki boshqa DB'dagi jadval nomi
        managed = False         # Jadvalni Django o'zi yaratmaydi

    def __str__(self):
        return f"Umumiy referal soni: {self.count}"

class Diagnostika(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(default=now)
    finished_at = models.DateTimeField(null=True, blank=True)  # ✅ Tugash vaqti
    status = models.BooleanField(default=True)  # ✅ Diagnostika holati (True - aktiv, False - tugagan)

    users = models.ManyToManyField(User, related_name="diagnostikas", db_table="user_diagnostika_association")

    class Meta:
        managed = False
        db_table = "diagnostika"

    def __str__(self):
        return self.name


class Subject(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True)
    is_compulsory_subject = models.BooleanField(default=False)
    is_foreign_language = models.BooleanField(default=False)
    diagnostikas = models.ManyToManyField(Diagnostika, related_name="subjects", db_table="diagnostika_subject_association")

    class Meta:
        managed = False
        db_table = "subjects"

    def __str__(self):
        return self.name


class Question(models.Model):
    id = models.BigAutoField(primary_key=True)
    question_text = models.TextField()
    image = models.CharField(max_length=255, null=True, blank=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="questions")
    diagnostika = models.ForeignKey(Diagnostika, on_delete=models.CASCADE, related_name="questions")
    is_mandatory = models.BooleanField(default=False)

    class Meta:
        managed = False
        db_table = "questions"

    def __str__(self):
        return f"{self.subject.name} - {self.question_text[:50]}"


class Answer(models.Model):
    id = models.BigAutoField(primary_key=True)
    text = models.TextField()
    is_correct = models.BooleanField(default=False)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="answers")

    class Meta:
        managed = False
        db_table = "answers"

    def __str__(self):
        return self.text[:50]


class History(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="history")
    diagnostika = models.ForeignKey(Diagnostika, on_delete=models.CASCADE, related_name="history")
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "history"

    def __str__(self):
        return f"{self.user.fullname} - {self.diagnostika.name}"

class Result(models.Model):
    id = models.BigAutoField(primary_key=True)
    diagnostika = models.ForeignKey(Diagnostika, on_delete=models.CASCADE, related_name="results")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="results")
    subject1_name = models.CharField(max_length=255)  # 1-fan nomi
    subject2_name = models.CharField(max_length=255)  # 2-fan nomi
    correct_answers_subject1 = models.IntegerField(default=0)  # 1-fan to‘g‘ri javoblar soni
    correct_answers_subject2 = models.IntegerField(default=0)  # 2-fan to‘g‘ri javoblar soni
    correct_answers_mandatory = models.IntegerField(default=0)  # Majburiy fan to‘g‘ri javoblar soni
    total_score = models.FloatField(default=0)  # Jami ball
    completed_at = models.DateTimeField(auto_now_add=True)  # Yakunlangan vaqti

    all_answer_ids = models.JSONField(default=list)
    correct_answer_ids = models.JSONField(default=list)  # ✅ To‘g‘ri javoblar ID lari
    wrong_answer_ids = models.JSONField(default=list)  # ✅ Noto‘g‘ri javoblar ID lari


    duration_time = models.CharField(max_length=8, default="00:00:00")   # ⏳ Testni qancha vaqt bajargan

    class Meta:
        managed = False
        db_table = "results"

    def __str__(self):
        return f"{self.user.fullname} - {self.diagnostika.name} - {self.total_score} ball"

class DiagnostikaSubjectAssociation(models.Model):
    diagnostika = models.ForeignKey("Diagnostika", on_delete=models.CASCADE)
    subject = models.ForeignKey("Subject", on_delete=models.CASCADE)

    class Meta:
        managed = False
        db_table = "diagnostika_subject_association"

    def __str__(self):
        return f"{self.diagnostika.name} - {self.subject.name}"

class Group(models.Model):
    id = models.AutoField(primary_key=True)
    chat_id = models.BigIntegerField(unique=True)
    username = models.CharField(max_length=255)
    title = models.CharField(max_length=255)

    class Meta:
        db_table = "groups"
        managed = False

    def __str__(self):
        return f"{self.title} (@{self.username})"

class ReferralHistory(models.Model):
    id = models.BigAutoField(primary_key=True)     # Majburiy emas, lekin aniqlik uchun yozdik
    inviter_id = models.BigIntegerField()
    invited_id = models.BigIntegerField()
    diagnostika_id = models.BigIntegerField()

    class Meta:
        db_table = 'referral_history'
        unique_together = ('inviter_id', 'invited_id', 'diagnostika_id')
        managed = False

    def __str__(self):
        return f"{self.inviter_id} ➜ {self.invited_id} (Diagnostika: {self.diagnostika_id})"