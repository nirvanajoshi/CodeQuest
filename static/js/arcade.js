(function () {
    "use strict";

    const container = document.getElementById("arcade-game");
    if (!container) return;

    const game = container.dataset.game;
    const authenticated = window.ARCADE_AUTHENTICATED === true;
    const resultBox = document.getElementById("arcade-result");
    const attemptForm = document.getElementById("arcade-attempt-form");

    function finish(score, detail, durationSeconds) {
        if (authenticated) {
            document.getElementById("field-score").value = Math.round(score);
            document.getElementById("field-detail").value = detail;
            document.getElementById("field-duration").value = durationSeconds.toFixed(1);
            attemptForm.submit();
            return;
        }
        resultBox.hidden = false;
        resultBox.innerHTML =
            "<h2>🏁 Game over</h2>" +
            "<p>Score " + Math.round(score) + (detail ? " · " + detail : "") + "</p>" +
            "<p class=\"text-muted\">Log in to save this score, earn XP, and appear on the leaderboard.</p>" +
            "<a href=\"/accounts/login/\" class=\"btn\">Login</a> " +
            "<a href=\"" + window.location.href + "\" class=\"btn-secondary\">Play again</a>";
    }

    // -----------------------------------------------------------------
    // Snake
    // -----------------------------------------------------------------

    function initSnake() {
        document.getElementById("snake-wrap").hidden = false;

        const GRID = 20;
        const CELL = 20;
        const canvas = document.getElementById("snake-canvas");
        const ctx = canvas.getContext("2d");
        const overlay = document.getElementById("snake-overlay");
        const scoreEl = document.getElementById("snake-score");
        const lengthEl = document.getElementById("snake-length");

        let snake, direction, pendingDirection, food, score, started, gameOver, startTime, loopTimeout, delay;

        function reset() {
            snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
            direction = { dx: 1, dy: 0 };
            pendingDirection = direction;
            score = 0;
            started = false;
            gameOver = false;
            startTime = null;
            delay = 150;
            food = spawnFood();
            scoreEl.textContent = "0";
            lengthEl.textContent = String(snake.length);
            overlay.hidden = false;
            draw();
        }

        function spawnFood() {
            let candidate;
            do {
                candidate = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
            } while (snake.some((s) => s.x === candidate.x && s.y === candidate.y));
            return candidate;
        }

        function roundedRect(x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
            ctx.fill();
        }

        function draw() {
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = "rgba(255,255,255,0.04)";
            for (let i = 1; i < GRID; i++) {
                ctx.beginPath();
                ctx.moveTo(i * CELL, 0);
                ctx.lineTo(i * CELL, canvas.height);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, i * CELL);
                ctx.lineTo(canvas.width, i * CELL);
                ctx.stroke();
            }

            ctx.fillStyle = "#ff6b6b";
            ctx.shadowColor = "#ff6b6b";
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            snake.forEach((seg, i) => {
                const isHead = i === 0;
                ctx.fillStyle = isHead ? "#69db7c" : "#37b24d";
                roundedRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 5);
            });
        }

        function tick() {
            direction = pendingDirection;
            const head = { x: snake[0].x + direction.dx, y: snake[0].y + direction.dy };

            const hitWall = head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID;
            const hitSelf = snake.some((s) => s.x === head.x && s.y === head.y);

            if (hitWall || hitSelf) {
                gameOver = true;
                const durationSeconds = startTime ? (Date.now() - startTime) / 1000 : 0;
                finish(score, "Length " + snake.length, durationSeconds);
                return;
            }

            snake.unshift(head);
            if (head.x === food.x && head.y === food.y) {
                score++;
                scoreEl.textContent = String(score);
                lengthEl.textContent = String(snake.length);
                food = spawnFood();
                delay = Math.max(70, delay - 4);
            } else {
                snake.pop();
            }

            draw();
            loopTimeout = setTimeout(tick, delay);
        }

        const KEY_MAP = {
            ArrowUp: { dx: 0, dy: -1 }, w: { dx: 0, dy: -1 }, W: { dx: 0, dy: -1 },
            ArrowDown: { dx: 0, dy: 1 }, s: { dx: 0, dy: 1 }, S: { dx: 0, dy: 1 },
            ArrowLeft: { dx: -1, dy: 0 }, a: { dx: -1, dy: 0 }, A: { dx: -1, dy: 0 },
            ArrowRight: { dx: 1, dy: 0 }, d: { dx: 1, dy: 0 }, D: { dx: 1, dy: 0 },
        };

        document.addEventListener("keydown", (event) => {
            if (gameOver) return;
            const next = KEY_MAP[event.key];
            if (!next) return;
            event.preventDefault();

            const isReverse = next.dx === -direction.dx && next.dy === -direction.dy;
            if (!isReverse) pendingDirection = next;

            if (!started) {
                started = true;
                startTime = Date.now();
                overlay.hidden = true;
                loopTimeout = setTimeout(tick, delay);
            }
        });

        reset();
    }

    // -----------------------------------------------------------------
    // Memory Match
    // -----------------------------------------------------------------

    function initMemoryMatch() {
        document.getElementById("memory-wrap").hidden = false;

        const ICONS = ["🍎", "🍌", "🍇", "🍓", "🍒", "🍑", "🥝", "🍉"];
        const values = ICONS.concat(ICONS);
        for (let i = values.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [values[i], values[j]] = [values[j], values[i]];
        }

        const grid = document.getElementById("memory-grid");
        const movesEl = document.getElementById("memory-moves");
        const timerEl = document.getElementById("memory-timer");
        const pairsEl = document.getElementById("memory-pairs");

        let moves = 0;
        let pairsFound = 0;
        let startTime = null;
        let timerInterval = null;
        let flipped = [];
        let locked = false;

        grid.innerHTML = "";
        const cardEls = values.map((value, index) => {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "memory-card";
            card.dataset.value = value;
            card.dataset.index = String(index);
            card.innerHTML = "<span class=\"memory-card-inner\">" +
                "<span class=\"memory-card-face memory-card-back\">?</span>" +
                "<span class=\"memory-card-face memory-card-front\">" + value + "</span>" +
                "</span>";
            card.addEventListener("click", () => onCardClick(card, index));
            grid.appendChild(card);
            return card;
        });

        function onCardClick(card, index) {
            if (locked || card.classList.contains("flipped") || card.classList.contains("matched")) return;
            if (!startTime) {
                startTime = Date.now();
                timerInterval = setInterval(() => {
                    timerEl.textContent = ((Date.now() - startTime) / 1000).toFixed(1);
                }, 100);
            }

            card.classList.add("flipped");
            flipped.push({ card, index, value: values[index] });

            if (flipped.length === 2) {
                moves++;
                movesEl.textContent = String(moves);
                const [a, b] = flipped;
                if (a.value === b.value) {
                    a.card.classList.add("matched");
                    b.card.classList.add("matched");
                    flipped = [];
                    pairsFound++;
                    pairsEl.textContent = String(pairsFound);
                    if (pairsFound === ICONS.length) {
                        clearInterval(timerInterval);
                        const durationSeconds = (Date.now() - startTime) / 1000;
                        const score = Math.max(0, 1000 - moves * 15 - Math.floor(durationSeconds) * 3);
                        finish(score, moves + " moves in " + durationSeconds.toFixed(1) + "s", durationSeconds);
                    }
                } else {
                    locked = true;
                    setTimeout(() => {
                        a.card.classList.remove("flipped");
                        b.card.classList.remove("flipped");
                        flipped = [];
                        locked = false;
                    }, 700);
                }
            }
        }
    }

    // -----------------------------------------------------------------
    // Reaction Time
    // -----------------------------------------------------------------

    function initReactionTime() {
        document.getElementById("reaction-wrap").hidden = false;

        const TOTAL_ROUNDS = 5;
        const box = document.getElementById("reaction-box");
        const message = document.getElementById("reaction-message");
        const roundEl = document.getElementById("reaction-round");
        const lastEl = document.getElementById("reaction-last");
        const avgEl = document.getElementById("reaction-avg");

        let round = 0;
        let waitTimeout = null;
        let goAt = null;
        let times = [];
        let state = "idle"; // idle | waiting | go | early | roundResult
        let firstRoundStartedAt = null;
        let finished = false;

        function setState(next, text) {
            state = next;
            box.className = "reaction-box state-" + next;
            message.textContent = text;
        }

        function startRound() {
            if (!firstRoundStartedAt) firstRoundStartedAt = Date.now();
            setState("waiting", "Wait for green…");
            const delay = 1000 + Math.random() * 3000;
            waitTimeout = setTimeout(() => {
                goAt = Date.now();
                setState("go", "Click now!");
            }, delay);
        }

        box.addEventListener("click", () => {
            if (finished) return;
            if (state === "idle") {
                startRound();
                return;
            }
            if (state === "waiting") {
                clearTimeout(waitTimeout);
                setState("early", "Too soon! Click to retry.");
                return;
            }
            if (state === "early" || state === "roundResult") {
                startRound();
                return;
            }
            if (state === "go") {
                const reaction = Date.now() - goAt;
                times.push(reaction);
                round++;
                roundEl.textContent = String(round);
                lastEl.textContent = reaction + "ms";
                const avg = times.reduce((a, b) => a + b, 0) / times.length;
                avgEl.textContent = Math.round(avg) + "ms";

                if (round >= TOTAL_ROUNDS) {
                    finished = true;
                    setState("roundResult", "Done! " + Math.round(avg) + "ms average");
                    const durationSeconds = (Date.now() - firstRoundStartedAt) / 1000;
                    const score = Math.max(0, Math.round(1000 - avg));
                    finish(score, "Avg " + Math.round(avg) + "ms over " + TOTAL_ROUNDS + " rounds", durationSeconds);
                } else {
                    setState("roundResult", reaction + "ms — click for round " + (round + 1));
                }
            }
        });
    }

    if (game === "snake") {
        initSnake();
    } else if (game === "memory_match") {
        initMemoryMatch();
    } else if (game === "reaction_time") {
        initReactionTime();
    }
})();
