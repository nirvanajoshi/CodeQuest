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

    // -----------------------------------------------------------------
    // Archery
    // -----------------------------------------------------------------

    function initArchery() {
        document.getElementById("archery-wrap").hidden = false;

        const TOTAL_ARROWS = 5;
        const range = document.getElementById("archery-range");
        const target = document.getElementById("archery-target");
        const crosshair = document.getElementById("archery-crosshair");
        const overlay = document.getElementById("archery-overlay");
        const scoreEl = document.getElementById("archery-score");
        const roundEl = document.getElementById("archery-round");
        const windEl = document.getElementById("archery-wind");

        let score = 0;
        let arrowsFired = 0;
        let wind = 0;
        let startTime = null;
        let busy = false;

        function newWind() {
            wind = Math.round(Math.random() * 30 - 15);
            const arrow = wind === 0 ? "–" : wind > 0 ? "→" : "←";
            windEl.textContent = arrow + " " + Math.abs(wind);
        }
        newWind();

        function ringScore(distPct) {
            if (distPct <= 0.12) return 100;
            if (distPct <= 0.3) return 80;
            if (distPct <= 0.5) return 60;
            if (distPct <= 0.72) return 40;
            if (distPct <= 1.0) return 20;
            return 0;
        }

        function ringClass(points) {
            if (points >= 100) return "ring-gold";
            if (points >= 80) return "ring-red";
            if (points >= 60) return "ring-blue";
            if (points >= 40) return "ring-black";
            if (points >= 20) return "ring-white";
            return "ring-miss";
        }

        function pointerPos(event) {
            const rect = range.getBoundingClientRect();
            return {
                x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
                y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
            };
        }

        function moveCrosshair(event) {
            if (busy || arrowsFired >= TOTAL_ARROWS) return;
            const pos = pointerPos(event);
            crosshair.hidden = false;
            crosshair.style.left = pos.x + "px";
            crosshair.style.top = pos.y + "px";
        }

        function fire(event) {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            if (busy || arrowsFired >= TOTAL_ARROWS) return;
            if (!startTime) startTime = Date.now();
            overlay.hidden = true;
            busy = true;

            const pos = pointerPos(event);
            const rangeRect = range.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const centerX = targetRect.left - rangeRect.left + targetRect.width / 2;
            const centerY = targetRect.top - rangeRect.top + targetRect.height / 2;
            const radius = targetRect.width / 2;

            const windPx = (wind / 15) * (radius * 0.35);
            const wobble = (Math.random() - 0.5) * radius * 0.12;
            const landX = pos.x + windPx + wobble;
            const landY = pos.y + (Math.random() - 0.5) * radius * 0.12;

            const dist = Math.hypot(landX - centerX, landY - centerY);
            const points = ringScore(radius > 0 ? dist / radius : 1);

            score += points;
            arrowsFired++;
            scoreEl.textContent = String(score);
            roundEl.textContent = String(arrowsFired);

            const hit = document.createElement("span");
            hit.className = "archery-hit " + ringClass(points);
            hit.style.left = landX + "px";
            hit.style.top = landY + "px";
            range.appendChild(hit);
            crosshair.hidden = true;

            setTimeout(() => {
                if (arrowsFired >= TOTAL_ARROWS) {
                    const durationSeconds = (Date.now() - startTime) / 1000;
                    finish(score, arrowsFired + " arrows, avg " + Math.round(score / arrowsFired) + " pts", durationSeconds);
                    return;
                }
                newWind();
                busy = false;
            }, 500);
        }

        range.addEventListener("pointermove", moveCrosshair);
        range.addEventListener("pointerdown", fire);
        range.addEventListener("pointerleave", () => {
            if (!busy) crosshair.hidden = true;
        });
    }

    // -----------------------------------------------------------------
    // Chess (vs a simple built-in opponent)
    // -----------------------------------------------------------------

    function initChess() {
        document.getElementById("chess-wrap").hidden = false;

        const boardEl = document.getElementById("chess-board");
        const turnEl = document.getElementById("chess-turn");
        const materialEl = document.getElementById("chess-material");
        const statusEl = document.getElementById("chess-status");
        const capturedBlackEl = document.getElementById("chess-captured-black");
        const capturedWhiteEl = document.getElementById("chess-captured-white");

        if (typeof Chess === "undefined") {
            statusEl.textContent = "Could not load the chess engine.";
            return;
        }

        const chess = new Chess();
        let selected = null;
        let legalTargets = [];
        let startTime = null;
        let gameEnded = false;
        let aiThinking = false;
        let materialDiff = 0;

        const PIECE_GLYPH = {
            w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
            b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
        };
        const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        const START_COUNTS = { p: 8, n: 2, b: 2, r: 2, q: 1 };

        function squareFromRC(row, col) {
            return "abcdefgh"[col] + String(8 - row);
        }

        function renderBoard() {
            const board = chess.board();
            const inCheck = chess.in_check();
            const turnColor = chess.turn();

            boardEl.innerHTML = "";
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const sq = squareFromRC(row, col);
                    const cell = board[row][col];
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "chess-square " + ((row + col) % 2 === 0 ? "light" : "dark");
                    btn.dataset.square = sq;

                    if (selected === sq) btn.classList.add("selected");
                    if (legalTargets.some((m) => m.to === sq)) {
                        btn.classList.add(cell ? "legal-capture" : "legal-move");
                    }
                    if (inCheck && cell && cell.type === "k" && cell.color === turnColor) {
                        btn.classList.add("in-check");
                    }

                    if (cell) {
                        const span = document.createElement("span");
                        span.className = "chess-piece piece-" + (cell.color === "w" ? "white" : "black");
                        span.textContent = PIECE_GLYPH[cell.color][cell.type];
                        btn.appendChild(span);
                    }

                    btn.addEventListener("click", () => onSquareClick(sq));
                    boardEl.appendChild(btn);
                }
            }
        }

        function renderCaptured() {
            const board = chess.board();
            const onBoard = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
            board.forEach((row) => row.forEach((cell) => {
                if (cell && cell.type !== "k") onBoard[cell.color][cell.type]++;
            }));

            capturedBlackEl.innerHTML = "";
            capturedWhiteEl.innerHTML = "";
            let playerValue = 0;
            let aiValue = 0;

            ["q", "r", "b", "n", "p"].forEach((type) => {
                const blackMissing = Math.max(0, START_COUNTS[type] - onBoard.b[type]);
                const whiteMissing = Math.max(0, START_COUNTS[type] - onBoard.w[type]);
                for (let i = 0; i < blackMissing; i++) {
                    const s = document.createElement("span");
                    s.className = "chess-captured-piece";
                    s.textContent = PIECE_GLYPH.b[type];
                    capturedBlackEl.appendChild(s);
                }
                for (let i = 0; i < whiteMissing; i++) {
                    const s = document.createElement("span");
                    s.className = "chess-captured-piece";
                    s.textContent = PIECE_GLYPH.w[type];
                    capturedWhiteEl.appendChild(s);
                }
                playerValue += blackMissing * PIECE_VALUE[type];
                aiValue += whiteMissing * PIECE_VALUE[type];
            });

            materialDiff = playerValue - aiValue;
            materialEl.textContent = materialDiff === 0 ? "Even" : materialDiff > 0 ? "+" + materialDiff : String(materialDiff);
        }

        function renderStatus() {
            const turnColor = chess.turn();
            turnEl.textContent = turnColor === "w" ? "White (you)" : "Black (computer)";

            if (chess.in_checkmate()) {
                statusEl.textContent = turnColor === "b" ? "Checkmate — you won!" : "Checkmate — you lost";
            } else if (chess.in_stalemate()) {
                statusEl.textContent = "Stalemate — draw";
            } else if (chess.insufficient_material()) {
                statusEl.textContent = "Draw — insufficient material";
            } else if (chess.in_threefold_repetition()) {
                statusEl.textContent = "Draw — repetition";
            } else if (chess.in_draw()) {
                statusEl.textContent = "Draw";
            } else if (chess.in_check()) {
                statusEl.textContent = turnColor === "w" ? "Check! Your move" : "Check!";
            } else {
                statusEl.textContent = turnColor === "w" ? "Your move" : "Computer thinking…";
            }
        }

        function render() {
            renderBoard();
            renderCaptured();
            renderStatus();
        }

        function checkGameOver() {
            if (gameEnded || !chess.game_over()) return;
            gameEnded = true;

            const durationSeconds = startTime ? (Date.now() - startTime) / 1000 : 0;
            const moveCount = Math.ceil(chess.history().length / 2);
            let score;
            let detail;

            if (chess.in_checkmate()) {
                if (chess.turn() === "b") {
                    score = Math.min(900, 500 + Math.max(0, materialDiff) * 10);
                    detail = "Checkmate in " + moveCount + " moves";
                } else {
                    score = Math.min(300, 50 + Math.max(0, -materialDiff) * 5);
                    detail = "Checkmated in " + moveCount + " moves";
                }
            } else {
                score = 200;
                detail = chess.in_stalemate() ? "Draw by stalemate" : "Draw";
            }

            finish(score, detail, durationSeconds);
        }

        function makeAiMove() {
            const moves = chess.moves({ verbose: true });
            if (!moves.length) return;

            let best = null;
            let bestScore = -Infinity;
            moves.forEach((m) => {
                let s = Math.random();
                if (m.flags.indexOf("c") !== -1 || m.flags.indexOf("e") !== -1) {
                    s += (PIECE_VALUE[m.captured] || 1) * 10;
                }
                chess.move({ from: m.from, to: m.to, promotion: "q" });
                if (chess.in_checkmate()) s += 10000;
                else if (chess.in_check()) s += 2;
                chess.undo();

                if (s > bestScore) {
                    bestScore = s;
                    best = m;
                }
            });

            if (best) chess.move({ from: best.from, to: best.to, promotion: "q" });
        }

        function scheduleAiMove() {
            aiThinking = true;
            setTimeout(() => {
                makeAiMove();
                aiThinking = false;
                render();
                checkGameOver();
            }, 450 + Math.random() * 350);
        }

        function onSquareClick(sq) {
            if (gameEnded || aiThinking || chess.turn() !== "w") return;
            if (!startTime) startTime = Date.now();

            if (selected && legalTargets.some((m) => m.to === sq)) {
                chess.move({ from: selected, to: sq, promotion: "q" });
                selected = null;
                legalTargets = [];
                render();
                checkGameOver();
                if (!gameEnded) scheduleAiMove();
                return;
            }

            const piece = chess.get(sq);
            if (piece && piece.color === "w") {
                selected = sq;
                legalTargets = chess.moves({ square: sq, verbose: true });
            } else {
                selected = null;
                legalTargets = [];
            }
            render();
        }

        render();
    }

    // -----------------------------------------------------------------
    // Car Racing (endless lane-dodging highway, nitro boost)
    // -----------------------------------------------------------------

    function initCarRacing() {
        document.getElementById("car-wrap").hidden = false;

        const canvas = document.getElementById("car-canvas");
        const ctx = canvas.getContext("2d");
        const overlay = document.getElementById("car-overlay");
        const scoreEl = document.getElementById("car-score");
        const speedEl = document.getElementById("car-speed");
        const nitroEl = document.getElementById("car-nitro");

        const LANES = 3;
        const ROAD_MARGIN = 24;
        const roadWidth = canvas.width - ROAD_MARGIN * 2;
        const laneWidth = roadWidth / LANES;
        const CAR_W = 38;
        const CAR_H = 62;
        const PLAYER_Y = canvas.height - 70;
        const BASE_SPEED = 190; // px/sec
        const MAX_SPEED = 620; // px/sec
        const NITRO_MULTIPLIER = 1.7;
        const NITRO_DURATION = 2200; // ms
        const OBSTACLE_COLORS = ["#e03131", "#f08c00", "#1971c2", "#37b24d", "#ae3ec9", "#f1f3f5"];

        function laneCenterX(lane) {
            return ROAD_MARGIN + laneWidth * lane + laneWidth / 2;
        }

        let lane, carX, obstacles, score, distance, speed, nitro, nitroActive, nitroTimer;
        let started, gameOver, startTime, lastTime, stripeOffset, spawnTimer, topSpeedKmh, rafId;

        function speedKmh(pxPerSec) {
            return Math.round(pxPerSec * 0.6);
        }

        function reset() {
            lane = 1;
            carX = laneCenterX(lane);
            obstacles = [];
            score = 0;
            distance = 0;
            speed = BASE_SPEED;
            nitro = 0;
            nitroActive = false;
            nitroTimer = 0;
            started = false;
            gameOver = false;
            startTime = null;
            lastTime = null;
            stripeOffset = 0;
            spawnTimer = 700;
            topSpeedKmh = 0;
            scoreEl.textContent = "0";
            speedEl.textContent = "0";
            nitroEl.textContent = "0";
            nitroEl.style.color = "";
            overlay.hidden = false;
            draw();
        }

        function spawnObstacle() {
            const occupied = new Set();
            const count = Math.random() < 0.22 ? 2 : 1;
            for (let i = 0; i < count; i++) {
                let obstacleLane;
                let attempts = 0;
                do {
                    obstacleLane = Math.floor(Math.random() * LANES);
                    attempts++;
                } while (occupied.has(obstacleLane) && attempts < 6);
                if (occupied.has(obstacleLane)) continue;
                occupied.add(obstacleLane);
                obstacles.push({
                    lane: obstacleLane,
                    y: -CAR_H - Math.random() * 80,
                    color: OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)],
                    passed: false,
                });
            }
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

        function drawCar(x, y, bodyColor) {
            ctx.fillStyle = bodyColor;
            roundedRect(x - CAR_W / 2, y - CAR_H / 2, CAR_W, CAR_H, 9);
            ctx.fillStyle = "rgba(20,22,31,0.85)";
            roundedRect(x - CAR_W / 2 + 6, y - CAR_H / 2 + 8, CAR_W - 12, CAR_H * 0.3, 4);
            ctx.fillStyle = "rgba(20,22,31,0.85)";
            roundedRect(x - CAR_W / 2 + 6, y + CAR_H * 0.08, CAR_W - 12, CAR_H * 0.22, 4);
        }

        function draw() {
            ctx.fillStyle = "#23262f";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "#33384a";
            ctx.fillRect(ROAD_MARGIN, 0, roadWidth, canvas.height);

            ctx.strokeStyle = "rgba(255,255,255,0.4)";
            ctx.lineWidth = 3;
            ctx.setLineDash([24, 20]);
            for (let i = 1; i < LANES; i++) {
                const x = ROAD_MARGIN + laneWidth * i;
                ctx.beginPath();
                ctx.moveTo(x, stripeOffset - 44);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            obstacles.forEach((o) => drawCar(laneCenterX(o.lane), o.y, o.color));
            drawCar(carX, PLAYER_Y, nitroActive ? "#ffd43b" : "#4c6ef5");
        }

        function endGame() {
            if (gameOver) return;
            gameOver = true;
            cancelAnimationFrame(rafId);
            const durationSeconds = startTime ? (Date.now() - startTime) / 1000 : 0;
            const meters = Math.round(distance / 10);
            finish(score, meters + "m · top " + topSpeedKmh + " km/h", durationSeconds);
        }

        function activateNitro() {
            if (nitro < 100 || nitroActive || gameOver) return;
            nitroActive = true;
            nitroTimer = NITRO_DURATION;
            nitro = 0;
            nitroEl.textContent = "0";
            score += 40;
        }

        function tick(timestamp) {
            if (gameOver) return;
            if (lastTime === null) lastTime = timestamp;
            const dt = Math.min(50, timestamp - lastTime);
            lastTime = timestamp;

            if (started) {
                const effSpeed = nitroActive ? speed * NITRO_MULTIPLIER : speed;
                const dtSec = dt / 1000;

                distance += effSpeed * dtSec;
                stripeOffset = (stripeOffset + effSpeed * dtSec) % 62;
                speed = Math.min(MAX_SPEED, BASE_SPEED + distance * 0.045);

                const kmh = speedKmh(effSpeed);
                if (kmh > topSpeedKmh) topSpeedKmh = kmh;
                speedEl.textContent = String(kmh);

                if (nitroActive) {
                    nitroTimer -= dt;
                    if (nitroTimer <= 0) nitroActive = false;
                }

                score += Math.round(effSpeed * dtSec * 0.4);
                scoreEl.textContent = String(score);

                spawnTimer -= dt;
                if (spawnTimer <= 0) {
                    spawnObstacle();
                    const interval = Math.max(360, 900 - speed * 0.9);
                    spawnTimer = interval + Math.random() * 260;
                }

                for (let i = obstacles.length - 1; i >= 0; i--) {
                    const o = obstacles[i];
                    o.y += effSpeed * dtSec;

                    if (!o.passed && o.y > PLAYER_Y + CAR_H) {
                        o.passed = true;
                        const bonus = nitroActive ? 30 : 15;
                        score += bonus;
                        nitro = Math.min(100, nitro + 12);
                        nitroEl.textContent = String(nitro);
                        nitroEl.style.color = nitro >= 100 ? "var(--games-success)" : "";
                        scoreEl.textContent = String(score);
                    }

                    if (o.lane === lane &&
                        Math.abs(o.y - PLAYER_Y) < (CAR_H * 0.8) &&
                        Math.abs(laneCenterX(o.lane) - carX) < CAR_W * 0.8) {
                        endGame();
                        return;
                    }

                    if (o.y - CAR_H > canvas.height) {
                        obstacles.splice(i, 1);
                    }
                }

                carX += (laneCenterX(lane) - carX) * Math.min(1, dt / 90);
            }

            draw();
            rafId = requestAnimationFrame(tick);
        }

        function beginIfNeeded() {
            if (started || gameOver) return;
            started = true;
            startTime = Date.now();
            overlay.hidden = true;
        }

        function moveLane(delta) {
            if (gameOver) return;
            beginIfNeeded();
            lane = Math.max(0, Math.min(LANES - 1, lane + delta));
        }

        const KEY_LEFT = { ArrowLeft: true, a: true, A: true };
        const KEY_RIGHT = { ArrowRight: true, d: true, D: true };

        document.addEventListener("keydown", (event) => {
            if (KEY_LEFT[event.key]) {
                event.preventDefault();
                moveLane(-1);
            } else if (KEY_RIGHT[event.key]) {
                event.preventDefault();
                moveLane(1);
            } else if (event.key === " " || event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
                event.preventDefault();
                beginIfNeeded();
                activateNitro();
            }
        });

        canvas.addEventListener("pointerdown", (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = (event.clientX - rect.left) * (canvas.width / rect.width);
            if (x < canvas.width / 3) moveLane(-1);
            else if (x > (canvas.width * 2) / 3) moveLane(1);
            else {
                beginIfNeeded();
                activateNitro();
            }
        });

        reset();
        rafId = requestAnimationFrame(tick);
    }

    if (game === "snake") {
        initSnake();
    } else if (game === "memory_match") {
        initMemoryMatch();
    } else if (game === "reaction_time") {
        initReactionTime();
    } else if (game === "archery") {
        initArchery();
    } else if (game === "chess") {
        initChess();
    } else if (game === "car_racing") {
        initCarRacing();
    }
})();
