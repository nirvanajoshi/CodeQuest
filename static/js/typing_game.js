(function () {
    "use strict";

    const container = document.getElementById("typing-game");
    if (!container) return;

    const mode = container.dataset.mode;
    const difficulty = container.dataset.difficulty || "easy";
    const authenticated = window.TYPING_GAME_AUTHENTICATED === true;

    const statWpm = document.getElementById("stat-wpm");
    const statAccuracy = document.getElementById("stat-accuracy");
    const statTimer = document.getElementById("stat-timer");
    const resultBox = document.getElementById("typing-result");
    const attemptForm = document.getElementById("attempt-form");

    let timerInterval = null;
    let startTime = null;

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function startClock() {
        startTime = Date.now();
        timerInterval = setInterval(() => {
            statTimer.textContent = ((Date.now() - startTime) / 1000).toFixed(1);
        }, 100);
    }

    function stopClock() {
        if (timerInterval) clearInterval(timerInterval);
    }

    function computeStats(correctChars, typedChars) {
        const elapsedMin = startTime ? (Date.now() - startTime) / 60000 : 0;
        const wpm = elapsedMin > 0 ? Math.round((correctChars / 5) / elapsedMin) : 0;
        const accuracy = typedChars > 0 ? Math.round((correctChars / typedChars) * 100) : 100;
        statWpm.textContent = wpm;
        statAccuracy.textContent = accuracy;
        return { wpm, accuracy };
    }

    function duration() {
        return startTime ? (Date.now() - startTime) / 1000 : 0;
    }

    function finish(outcome, wpm, accuracy) {
        stopClock();
        const durationSeconds = duration();

        if (authenticated) {
            document.getElementById("field-wpm").value = wpm;
            document.getElementById("field-accuracy").value = accuracy;
            document.getElementById("field-duration").value = durationSeconds.toFixed(1);
            document.getElementById("field-outcome").value = outcome;
            attemptForm.submit();
            return;
        }

        const titles = {
            won: "🏆 You won!",
            lost: "💥 Not quite — try again",
            finished: "✅ Finished",
        };
        resultBox.hidden = false;
        resultBox.innerHTML =
            "<h2>" + (titles[outcome] || titles.finished) + "</h2>" +
            "<p>" + wpm + " WPM · " + accuracy + "% accuracy · " + durationSeconds.toFixed(1) + "s</p>" +
            "<p class=\"text-muted\">Log in to save this score, earn XP, and appear on the leaderboard.</p>" +
            "<a href=\"/accounts/login/\" class=\"btn\">Login</a> " +
            "<a href=\"" + window.location.href + "\" class=\"btn-secondary\">Play again</a>";
    }

    // ---------------------------------------------------------------
    // Passage-based modes: classic, car_race, battle, rocket
    // ---------------------------------------------------------------

    function initPassageMode() {
        const text = window.TYPING_GAME_TEXT || "";
        const passageEl = document.getElementById("typing-passage");
        const input = document.getElementById("type-input");
        const chars = text.split("");

        if (!chars.length) {
            passageEl.textContent = "No passage is available right now — try again later.";
            input.disabled = true;
            return;
        }

        passageEl.innerHTML = chars
            .map((c) => "<span class=\"char\">" + escapeHtml(c) + "</span>")
            .join("");
        const spans = passageEl.querySelectorAll(".char");
        if (spans[0]) spans[0].classList.add("char-current");

        let finished = false;
        let modeInterval = null;

        // Mode-specific setup
        const raceTrack = document.getElementById("race-track");
        const battleArena = document.getElementById("battle-arena");
        const rocketTrack = document.getElementById("rocket-track");
        const playerCar = document.getElementById("player-car");
        const rivalCar = document.getElementById("rival-car");
        const playerHp = document.getElementById("player-hp");
        const bossHp = document.getElementById("boss-hp");
        const rocket = document.getElementById("rocket");
        const fuelFill = document.getElementById("fuel-fill");

        const rivalWpmByDifficulty = { easy: 28, medium: 42, hard: 58 };
        const fuelSecondsByDifficulty = { easy: 60, medium: 45, hard: 35 };
        let playerHpValue = 100;
        let fuelSeconds = fuelSecondsByDifficulty[difficulty] || 45;
        let fuelElapsed = 0;

        function setBarWidth(el, pct) {
            el.style.width = Math.max(0, Math.min(100, pct)) + "%";
        }

        if (mode === "car_race") {
            raceTrack.hidden = false;
        } else if (mode === "battle") {
            battleArena.hidden = false;
            setBarWidth(playerHp, 100);
            setBarWidth(bossHp, 100);
        } else if (mode === "rocket") {
            rocketTrack.hidden = false;
            setBarWidth(fuelFill, 100);
        }

        function startModeAnimation() {
            if (mode === "car_race") {
                const targetWpm = rivalWpmByDifficulty[difficulty] || 35;
                modeInterval = setInterval(() => {
                    const elapsedMin = (Date.now() - startTime) / 60000;
                    const rivalChars = elapsedMin * targetWpm * 5;
                    const rivalProgress = Math.min(1, chars.length ? rivalChars / chars.length : 1);
                    rivalCar.style.left = (rivalProgress * 92) + "%";
                    if (rivalProgress >= 1 && !finished) {
                        finished = true;
                        input.disabled = true;
                        clearInterval(modeInterval);
                        const { wpm, accuracy } = computeStats(correctChars, typedChars);
                        finish("lost", wpm, accuracy);
                    }
                }, 100);
            } else if (mode === "rocket") {
                modeInterval = setInterval(() => {
                    fuelElapsed += 0.1;
                    const remaining = Math.max(0, 1 - fuelElapsed / fuelSeconds);
                    setBarWidth(fuelFill, remaining * 100);
                    if (remaining <= 0 && !finished) {
                        finished = true;
                        input.disabled = true;
                        clearInterval(modeInterval);
                        const { wpm, accuracy } = computeStats(correctChars, typedChars);
                        finish("lost", wpm, accuracy);
                    }
                }, 100);
            }
        }

        let correctChars = 0;
        let typedChars = 0;

        input.addEventListener("input", (event) => {
            if (finished) return;
            if (!startTime) {
                startClock();
                startModeAnimation();
            }

            let value = input.value;
            if (value.length > chars.length) {
                value = value.slice(0, chars.length);
                input.value = value;
            }

            const isInsert = !event.inputType || event.inputType.indexOf("insert") === 0;
            if (isInsert && value.length > 0) {
                const idx = value.length - 1;
                if (value[idx] !== chars[idx] && mode === "battle") {
                    playerHpValue = Math.max(0, playerHpValue - 8);
                    setBarWidth(playerHp, playerHpValue);
                    battleArena.classList.add("shake");
                    setTimeout(() => battleArena.classList.remove("shake"), 200);
                    if (playerHpValue <= 0 && !finished) {
                        finished = true;
                        input.disabled = true;
                        const { wpm, accuracy } = computeStats(correctChars, typedChars);
                        finish("lost", wpm, accuracy);
                        return;
                    }
                }
            }

            let correct = 0;
            for (let i = 0; i < value.length; i++) {
                if (value[i] === chars[i]) {
                    spans[i].className = "char char-correct";
                    correct++;
                } else {
                    spans[i].className = "char char-incorrect";
                }
            }
            for (let i = value.length; i < spans.length; i++) {
                spans[i].className = "char" + (i === value.length ? " char-current" : "");
            }
            correctChars = correct;
            typedChars = value.length;

            const { wpm, accuracy } = computeStats(correctChars, typedChars);
            const progress = chars.length ? value.length / chars.length : 0;

            if (mode === "car_race") {
                playerCar.style.left = (progress * 92) + "%";
            } else if (mode === "battle") {
                setBarWidth(bossHp, (1 - progress) * 100);
            } else if (mode === "rocket") {
                rocket.style.bottom = (progress * 88) + "%";
            }

            if (value.length === chars.length && correct === chars.length) {
                finished = true;
                input.disabled = true;
                if (modeInterval) clearInterval(modeInterval);
                const outcome = mode === "classic" ? "finished" : "won";
                finish(outcome, wpm, accuracy);
            }
        });

        input.focus();
    }

    // ---------------------------------------------------------------
    // Word Rain
    // ---------------------------------------------------------------

    function initWordRain() {
        document.getElementById("word-rain-area").hidden = false;
        document.getElementById("typing-passage-wrap").hidden = true;

        const DEFAULT_WORDS = [
            "function", "variable", "loop", "array", "object", "string",
            "boolean", "return", "import", "class", "method", "python",
            "django", "server", "database", "keyboard", "compile", "debug",
            "syntax", "module",
        ];
        let words = (window.TYPING_GAME_WORDS && window.TYPING_GAME_WORDS.length
            ? window.TYPING_GAME_WORDS.slice()
            : DEFAULT_WORDS.slice());

        for (let i = words.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [words[i], words[j]] = [words[j], words[i]];
        }

        const rainZone = document.getElementById("rain-zone");
        const input = document.getElementById("word-input");
        const livesEl = document.getElementById("lives");

        let lives = 3;
        let wordIndex = 0;
        let correctChars = 0;
        let wordsCorrect = 0;
        let wordsMissed = 0;
        let fallMs = 4200;
        let currentWord = "";
        let currentWordEl = null;
        let fallTimeout = null;
        let finished = false;

        function updateLives() {
            livesEl.textContent = "❤️".repeat(lives) + "🖤".repeat(3 - lives);
        }
        updateLives();

        function accuracy() {
            const total = wordsCorrect + wordsMissed;
            return total > 0 ? Math.round((wordsCorrect / total) * 100) : 100;
        }

        function liveStats() {
            const elapsedMin = startTime ? (Date.now() - startTime) / 60000 : 0;
            const wpm = elapsedMin > 0 ? Math.round((correctChars / 5) / elapsedMin) : 0;
            const acc = accuracy();
            statWpm.textContent = wpm;
            statAccuracy.textContent = acc;
            return { wpm, accuracy: acc };
        }

        function spawnWord() {
            if (finished) return;
            if (wordIndex >= words.length) {
                finished = true;
                input.disabled = true;
                const { wpm, accuracy: acc } = liveStats();
                finish("won", wpm, acc);
                return;
            }
            currentWord = words[wordIndex++];
            currentWordEl = document.createElement("div");
            currentWordEl.className = "falling-word";
            currentWordEl.textContent = currentWord;
            currentWordEl.style.left = (8 + Math.random() * 74) + "%";
            currentWordEl.style.transitionDuration = fallMs + "ms";
            rainZone.appendChild(currentWordEl);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (currentWordEl) currentWordEl.style.top = "100%";
                });
            });

            fallTimeout = setTimeout(() => {
                if (currentWordEl) currentWordEl.remove();
                currentWordEl = null;
                lives--;
                wordsMissed++;
                updateLives();
                input.value = "";
                if (lives <= 0) {
                    finished = true;
                    input.disabled = true;
                    const { wpm, accuracy: acc } = liveStats();
                    finish("lost", wpm, acc);
                    return;
                }
                fallMs = Math.max(1400, fallMs - 80);
                spawnWord();
            }, fallMs);
        }

        input.addEventListener("input", () => {
            if (finished) return;
            if (!startTime) {
                startClock();
                spawnWord();
            }
            if (input.value === currentWord) {
                clearTimeout(fallTimeout);
                if (currentWordEl) currentWordEl.remove();
                currentWordEl = null;
                correctChars += currentWord.length;
                wordsCorrect++;
                input.value = "";
                fallMs = Math.max(1400, fallMs - 80);
                liveStats();
                spawnWord();
            }
        });

        input.focus();
    }

    if (mode === "word_rain") {
        initWordRain();
    } else {
        initPassageMode();
    }
})();
