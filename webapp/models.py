from django.db import models

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
    share_value = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "users"

    def __str__(self):
        return self.fullname if self.fullname else f"User {self.user_id}"


class Diagnostika(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
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
