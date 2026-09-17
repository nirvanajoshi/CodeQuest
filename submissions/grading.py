"""A minimal, synchronous code judge.

SECURITY WARNING: this executes submitted source code directly on the host
process via subprocess, with only a wall-clock timeout for protection. It
has no sandboxing (no container, no seccomp, no filesystem/network isolation,
no memory limit) and must never be exposed to untrusted users on a shared or
public deployment. It is appropriate only for local/trusted development, as
is typical for a student project. Replacing this module with a real sandbox
(e.g. Docker per submission, or a hosted judge API) is the way to make code
execution safe for real users.
"""
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from .models import Submission

MAX_OUTPUT_CHARS = 4000
TIMEOUT_BUFFER_SECONDS = 0.5

_STATUS_PRIORITY = {
    Submission.Status.RUNTIME_ERROR: 3,
    Submission.Status.TIME_LIMIT: 2,
    Submission.Status.WRONG_ANSWER: 1,
}


class LanguageUnavailable(Exception):
    pass


def _run_python(source_code, stdin_data, timeout):
    with tempfile.TemporaryDirectory() as tmp:
        script_path = Path(tmp) / "solution.py"
        script_path.write_text(source_code, encoding="utf-8")
        return subprocess.run(
            [sys.executable, str(script_path)],
            input=stdin_data,
            capture_output=True,
            text=True,
            timeout=timeout,
        )


def _run_javascript(source_code, stdin_data, timeout):
    if shutil.which("node") is None:
        raise LanguageUnavailable("Node.js runtime is not available on this server.")
    with tempfile.TemporaryDirectory() as tmp:
        script_path = Path(tmp) / "solution.js"
        script_path.write_text(source_code, encoding="utf-8")
        return subprocess.run(
            ["node", str(script_path)],
            input=stdin_data,
            capture_output=True,
            text=True,
            timeout=timeout,
        )


def _unavailable(display_name):
    def runner(source_code, stdin_data, timeout):
        raise LanguageUnavailable(
            f"{display_name} execution is not available on this server."
        )

    return runner


RUNNERS = {
    Submission.Language.PYTHON: _run_python,
    Submission.Language.JAVASCRIPT: _run_javascript,
    Submission.Language.JAVA: _unavailable("Java"),
    Submission.Language.CPP: _unavailable("C++"),
    Submission.Language.C: _unavailable("C"),
}


def _worse(current, candidate):
    if current is None:
        return candidate
    return current if _STATUS_PRIORITY[current] >= _STATUS_PRIORITY[candidate] else candidate


def _truncate(text):
    if len(text) > MAX_OUTPUT_CHARS:
        return text[:MAX_OUTPUT_CHARS] + "\n... (truncated)"
    return text


def grade_submission(submission):
    """Runs the submission's source code against its challenge's test cases
    and updates status/score/execution_time/feedback in place. Returns the
    saved submission."""
    challenge = submission.challenge
    test_cases = list(challenge.test_cases.all())
    runner = RUNNERS.get(submission.language)

    if runner is None or not test_cases:
        submission.status = Submission.Status.RUNTIME_ERROR
        submission.score = 0
        submission.execution_time = None
        submission.feedback = (
            "No test cases have been configured for this challenge yet."
            if test_cases == []
            else "This language is not supported for grading."
        )
        submission.save()
        return submission

    results = []
    total_time = 0.0
    worst_status = None

    for index, test_case in enumerate(test_cases, start=1):
        label = f"Test case {index}" + (" (hidden)" if test_case.is_hidden else "")
        timeout = test_case.time_limit + TIMEOUT_BUFFER_SECONDS

        try:
            start = time.monotonic()
            proc = runner(submission.source_code, test_case.input_data, timeout)
            total_time += time.monotonic() - start

            if proc.returncode != 0:
                worst_status = _worse(worst_status, Submission.Status.RUNTIME_ERROR)
                if test_case.is_hidden:
                    results.append(f"{label}: Runtime Error")
                else:
                    results.append(
                        f"{label}: Runtime Error\n{_truncate(proc.stderr.strip())}"
                    )
                continue

            actual = proc.stdout.strip()
            expected = test_case.expected_output.strip()
            if actual == expected:
                results.append(f"{label}: Passed")
            else:
                worst_status = _worse(worst_status, Submission.Status.WRONG_ANSWER)
                if test_case.is_hidden:
                    results.append(f"{label}: Wrong Answer")
                else:
                    results.append(
                        f"{label}: Wrong Answer\n"
                        f"Input: {test_case.input_data}\n"
                        f"Expected: {expected}\n"
                        f"Got: {_truncate(actual)}"
                    )
        except subprocess.TimeoutExpired:
            total_time += timeout
            worst_status = _worse(worst_status, Submission.Status.TIME_LIMIT)
            results.append(f"{label}: Time Limit Exceeded")
        except LanguageUnavailable as exc:
            submission.status = Submission.Status.RUNTIME_ERROR
            submission.score = 0
            submission.execution_time = None
            submission.feedback = str(exc)
            submission.save()
            return submission
        except OSError as exc:
            worst_status = _worse(worst_status, Submission.Status.RUNTIME_ERROR)
            results.append(f"{label}: Runtime Error\n{exc}")

    passed = sum(1 for r in results if r.endswith(": Passed"))
    total = len(test_cases)

    if worst_status is None:
        submission.status = Submission.Status.ACCEPTED
        submission.score = challenge.points
    else:
        submission.status = worst_status
        submission.score = round(challenge.points * passed / total) if total else 0

    submission.execution_time = round(total_time, 3)
    submission.feedback = "\n\n".join(results)
    submission.save()
    return submission
