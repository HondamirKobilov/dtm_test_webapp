from rest_framework import serializers
from .models import Diagnostika, Answer, Question


class DiagnostikaSerializer(serializers.ModelSerializer):
    users_count = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S")

    class Meta:
        model = Diagnostika
        fields = ['id', 'name', 'created_at', 'users_count']

    def get_users_count(self, obj):
        return obj.users.count()
class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ['id', 'text', 'is_correct']

class QuestionSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'question_text', 'image', 'answers']