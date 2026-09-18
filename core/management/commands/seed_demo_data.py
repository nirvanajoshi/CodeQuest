import datetime

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from challenges.models import Challenge, TestCase
from competitions.models import Competition, CompetitionChallenge
from courses.models import Course, Lesson
from quizzes.models import Question, Quiz


class Command(BaseCommand):
    help = (
        "Seeds a handful of published courses, lessons, challenges, quizzes and "
        "a running competition, so a freshly registered user has content to "
        "explore and XP/badges/streaks/leaderboards have something to react to. "
        "Safe to run more than once — everything is get_or_create'd by slug/title."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        courses = self._seed_courses()
        self._seed_competition(courses)
        self.stdout.write(self.style.SUCCESS("Demo data is seeded."))

    def _course(self, title, description, difficulty):
        course, _ = Course.objects.get_or_create(
            slug=slugify(title),
            defaults={
                "title": title,
                "description": description,
                "difficulty": difficulty,
                "is_published": True,
            },
        )
        return course

    def _lesson(self, course, title, content, order, minutes):
        lesson, _ = Lesson.objects.get_or_create(
            course=course,
            title=title,
            defaults={"content": content, "order": order, "estimated_minutes": minutes},
        )
        return lesson

    def _challenge(self, lesson, title, description, difficulty, points, *, input_format="",
                    output_format="", constraints="", sample_input="", sample_output="",
                    test_cases):
        challenge, created = Challenge.objects.get_or_create(
            slug=slugify(title),
            defaults={
                "title": title,
                "description": description,
                "difficulty": difficulty,
                "points": points,
                "lesson": lesson,
                "input_format": input_format,
                "output_format": output_format,
                "constraints": constraints,
                "sample_input": sample_input,
                "sample_output": sample_output,
                "is_published": True,
            },
        )
        if created:
            for input_data, expected_output, is_hidden in test_cases:
                TestCase.objects.create(
                    challenge=challenge,
                    input_data=input_data,
                    expected_output=expected_output,
                    is_hidden=is_hidden,
                )
        return challenge

    def _quiz(self, course, title, description, time_limit, passing_score, questions):
        quiz, created = Quiz.objects.get_or_create(
            course=course,
            title=title,
            defaults={
                "description": description,
                "time_limit": time_limit,
                "passing_score": passing_score,
                "is_published": True,
            },
        )
        if created:
            for order, (text, options, correct, points) in enumerate(questions, start=1):
                Question.objects.create(
                    quiz=quiz,
                    question_text=text,
                    option_a=options[0],
                    option_b=options[1],
                    option_c=options[2],
                    option_d=options[3],
                    correct_option=correct,
                    points=points,
                    order=order,
                )
        return quiz

    def _seed_courses(self):
        python_course = self._course(
            "Python Fundamentals",
            "Start from zero: variables, control flow, and your first solved challenges.",
            Course.Difficulty.BEGINNER,
        )
        basics_lesson = self._lesson(
            python_course,
            "Getting Started with Python",
            "Python programs read input, transform it, and print a result. Every "
            "challenge on CodeQuest follows that shape: read from standard input, "
            "print your answer to standard output.",
            order=1,
            minutes=15,
        )
        self._challenge(
            basics_lesson,
            "Sum of Two Numbers",
            "Read two integers, separated by a space, from a single line of input. "
            "Print their sum.",
            Challenge.Difficulty.EASY,
            10,
            input_format="One line: two integers separated by a space.",
            output_format="A single integer: the sum.",
            sample_input="3 5",
            sample_output="8",
            test_cases=[
                ("3 5", "8", True),
                ("10 20", "30", True),
                ("-1 1", "0", False),
            ],
        )
        self._challenge(
            basics_lesson,
            "Even or Odd",
            "Read a single integer and print 'Even' if it is even, or 'Odd' otherwise.",
            Challenge.Difficulty.EASY,
            10,
            input_format="One line: a single integer.",
            output_format="'Even' or 'Odd'.",
            sample_input="4",
            sample_output="Even",
            test_cases=[
                ("4", "Even", True),
                ("7", "Odd", True),
                ("0", "Even", False),
            ],
        )

        loops_lesson = self._lesson(
            python_course,
            "Loops & Control Flow",
            "Loops let a program repeat work. Combined with conditionals, they're "
            "the building blocks behind almost every challenge you'll solve here.",
            order=2,
            minutes=20,
        )
        self._challenge(
            loops_lesson,
            "FizzBuzz",
            "Read an integer n. Print the numbers from 1 to n, one per line. For "
            "multiples of 3 print 'Fizz' instead, for multiples of 5 print 'Buzz', "
            "and for multiples of both print 'FizzBuzz'.",
            Challenge.Difficulty.EASY,
            15,
            input_format="One line: a single integer n.",
            output_format="n lines.",
            sample_input="5",
            sample_output="1\n2\nFizz\n4\nBuzz",
            test_cases=[
                ("5", "1\n2\nFizz\n4\nBuzz", True),
                ("15", "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz", True),
                ("3", "1\n2\nFizz", False),
            ],
        )
        self._challenge(
            loops_lesson,
            "Reverse a String",
            "Read a line of text and print it reversed.",
            Challenge.Difficulty.MEDIUM,
            20,
            input_format="One line: a string with no spaces.",
            output_format="The reversed string.",
            sample_input="hello",
            sample_output="olleh",
            test_cases=[
                ("hello", "olleh", True),
                ("CodeQuest", "tseuQedoC", True),
                ("ab", "ba", False),
            ],
        )

        self._quiz(
            python_course,
            "Python Fundamentals Quiz",
            "Check your understanding of variables, types, and control flow.",
            time_limit=10,
            passing_score=60,
            questions=[
                (
                    "Which keyword defines a function in Python?",
                    ["func", "def", "function", "lambda"],
                    "b",
                    1,
                ),
                (
                    "What does len('hello') return?",
                    ["4", "5", "6", "Error"],
                    "b",
                    1,
                ),
                (
                    "Which of these is a mutable data type?",
                    ["tuple", "str", "list", "int"],
                    "c",
                    1,
                ),
            ],
        )

        js_course = self._course(
            "JavaScript Basics",
            "Arrays, functions, and the fundamentals of JavaScript for the web.",
            Course.Difficulty.BEGINNER,
        )
        js_lesson = self._lesson(
            js_course,
            "Arrays & Functions",
            "Arrays store ordered collections of values; functions let you name "
            "and reuse a piece of logic.",
            order=1,
            minutes=15,
        )
        self._challenge(
            js_lesson,
            "Find the Maximum",
            "Read a line of space-separated integers and print the largest one.",
            Challenge.Difficulty.EASY,
            10,
            input_format="One line: space-separated integers.",
            output_format="The largest integer.",
            sample_input="1 5 3",
            sample_output="5",
            test_cases=[
                ("1 5 3", "5", True),
                ("10 -2 7", "10", True),
                ("4 4 4", "4", False),
            ],
        )

        dsa_course = self._course(
            "Data Structures & Algorithms",
            "Strings, arrays, and the problem-solving patterns behind technical interviews.",
            Course.Difficulty.INTERMEDIATE,
        )
        dsa_lesson = self._lesson(
            dsa_course,
            "Strings & Two-Pointer Problems",
            "Many string and array problems can be solved by scanning from both "
            "ends at once, or by checking a running condition as you go.",
            order=1,
            minutes=25,
        )
        self._challenge(
            dsa_lesson,
            "Palindrome Check",
            "Read a line of text and print 'Yes' if it reads the same forwards and "
            "backwards, or 'No' otherwise.",
            Challenge.Difficulty.MEDIUM,
            20,
            input_format="One line: a string with no spaces.",
            output_format="'Yes' or 'No'.",
            sample_input="level",
            sample_output="Yes",
            test_cases=[
                ("level", "Yes", True),
                ("hello", "No", True),
                ("a", "Yes", False),
            ],
        )
        self._challenge(
            dsa_lesson,
            "Two Sum Exists",
            "Read a line of space-separated integers, then a second line with a "
            "target integer. Print 'Yes' if any two numbers in the list add up to "
            "the target, or 'No' otherwise.",
            Challenge.Difficulty.HARD,
            30,
            input_format="Line 1: space-separated integers. Line 2: the target integer.",
            output_format="'Yes' or 'No'.",
            sample_input="2 7 11 15\n9",
            sample_output="Yes",
            test_cases=[
                ("2 7 11 15\n9", "Yes", True),
                ("3 2 4\n6", "Yes", True),
                ("1 2 3\n50", "No", False),
            ],
        )
        self._quiz(
            dsa_course,
            "Data Structures Quiz",
            "Big-O intuition and basic data structure behavior.",
            time_limit=15,
            passing_score=70,
            questions=[
                (
                    "What is the time complexity of looking up a value by key in a hash map, on average?",
                    ["O(n)", "O(log n)", "O(1)", "O(n^2)"],
                    "c",
                    1,
                ),
                (
                    "Which data structure is naturally FIFO (first in, first out)?",
                    ["Stack", "Queue", "Set", "Tree"],
                    "b",
                    1,
                ),
                (
                    "Reversing a string with two pointers moving toward the middle runs in what time complexity?",
                    ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
                    "c",
                    1,
                ),
            ],
        )

        return {"python": python_course, "js": js_course, "dsa": dsa_course}

    def _seed_competition(self, courses):
        if Competition.objects.filter(title="Weekly Sprint").exists():
            return

        now = timezone.now()
        competition = Competition.objects.create(
            title="Weekly Sprint",
            description="A short-running mix of challenges from every track. Solve "
            "as many as you can before it closes.",
            start_time=now - datetime.timedelta(days=1),
            end_time=now + datetime.timedelta(days=6),
        )

        challenge_points = [
            ("sum-of-two-numbers", 100),
            ("fizzbuzz", 150),
            ("palindrome-check", 200),
        ]
        for order, (slug, points) in enumerate(challenge_points, start=1):
            challenge = Challenge.objects.filter(slug=slug).first()
            if challenge:
                CompetitionChallenge.objects.get_or_create(
                    competition=competition,
                    challenge=challenge,
                    defaults={"points": points, "order": order},
                )
