# CodeQuest

A gamified programming education platform. Users solve coding challenges, take quizzes, earn XP and badges, track streaks, climb leaderboards, and compete in scheduled competitions.

## Tech stack

- **Backend:** Django 5.2 LTS, Python 3.14
- **Database:** PostgreSQL
- **Frontend:** Django templates, plain HTML/CSS/JS (no frontend framework)
- **Static files (production):** WhiteNoise

## Features

| App | Responsibility |
| --- | --- |
| `accounts` | Registration, login, password reset, profile (bio, avatar, skill level, XP, streak) |
| `courses` | Courses, lessons, lesson content pages |
| `challenges` | Coding problems, hidden/visible test cases |
| `submissions` | Code submission, grading, submission history |
| `quizzes` | Multiple-choice quizzes with timed attempts and per-question results |
| `gamification` | XP transactions, streaks, badges |
| `leaderboards` | Global and per-course rankings |
| `competitions` | Scheduled contests with their own point values and leaderboard |
| `community` | Per-course discussions, comments, comment reports |
| `notifications` | In-app notifications (badge earned, challenge solved, quiz completed, new comment) |
| `typing_game` | The default game everyone can play — one typing test, five modes: Classic Sprint, Car Race, Boss Battle, Rocket Launch, Word Rain. Playable without an account; logged-in players earn XP (once per mode per day), unlock the "Speed Typer" badge, and appear on the typing leaderboard. |
| `core` | Home page, about page |

### Code execution / grading

Submissions are graded synchronously: the submitted source runs against the challenge's test cases (hidden ones only reveal pass/fail, visible ones show input/expected/actual output for debugging) and the result — accepted / wrong answer / runtime error / time limit exceeded — is saved immediately with a proportional score.

**Supported languages:** Python and JavaScript (run via the host's own interpreter/`node`). Java, C++, and C are recognized as options but return a clear "not available on this server" result rather than a fake pass, since no compiler toolchain is wired up.

**⚠️ Security note:** grading executes submitted code directly on the host process via `subprocess`, with only a wall-clock timeout for protection — no container, filesystem isolation, network isolation, or memory limit. This is fine for local/trusted development but **must not be exposed to untrusted users in a public deployment** without replacing `submissions/grading.py` with a real sandbox (Docker-per-submission, gVisor, or a hosted judge API).

### Known limitations

- Quiz timers are enforced client-side (JS) only; there's no server-side deadline check at submit time.
- Course/challenge/quiz content is authored through Django admin — there's no in-app content creation UI for instructors yet.
- Media uploads (avatars, course thumbnails) are served from local disk; a production deployment would need object storage (S3-compatible) since WhiteNoise only handles *static* files, not user uploads.
- No real-time features (competitions are polling/refresh-based, not WebSocket-driven).

## Setup

### Prerequisites

- Python 3.13+ (3.14 recommended)
- PostgreSQL running locally
- Node.js, if you want JavaScript submissions to actually grade (optional — Python grading works without it)

### 1. Clone and create a virtual environment

```bash
git clone <repo-url>
cd CodeQuest
python -m venv venv
```

Activate it:

```bash
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

Generate a secret key:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 4. Create the database

```sql
-- as a postgres superuser
CREATE ROLE codequest WITH LOGIN PASSWORD 'your-password-here';
CREATE DATABASE codequest OWNER codequest;
```

Match the credentials in `.env` to whatever you create here.

### 5. Run migrations

```bash
python manage.py migrate
```

This also seeds four starter badges (First Steps, Problem Solver, Consistent Learner, Quiz Master) via data migrations in `gamification`.

### 6. Create a superuser

```bash
python manage.py createsuperuser
```

### 6b. Seed demo content (optional but recommended)

A fresh database has no courses, challenges, quizzes, or competitions — so a
newly registered user has nothing to solve and no way to earn XP or badges.
Seed some starter content:

```bash
python manage.py seed_demo_data
```

This creates 3 published courses (Python Fundamentals, JavaScript Basics,
Data Structures & Algorithms) with lessons, 7 solvable challenges with test
cases, 2 quizzes, and a running "Weekly Sprint" competition. It's safe to run
more than once — it won't create duplicates.

### 7. Run the dev server

```bash
python manage.py runserver
```

Visit `http://127.0.0.1:8000/`. Course/lesson/challenge/quiz/competition content is authored via `/admin/`.

## Running tests

```bash
python manage.py test
```

The test database role needs `CREATEDB` privilege:

```sql
ALTER ROLE codequest CREATEDB;
```

## Deploying

Set `DEBUG=False` and a real `ALLOWED_HOSTS` in your environment. That flips on:

- WhiteNoise-served, hashed static files (run `python manage.py collectstatic` first — the hashed/manifest storage only works after this has been run)
- `SECURE_SSL_REDIRECT`, secure session/CSRF cookies, and HSTS headers (see the bottom of `codequest/settings.py`)

You'll still need to point `EMAIL_BACKEND` at a real backend (SMTP, SES, etc.) for password reset emails to actually send — it defaults to printing to the console.
