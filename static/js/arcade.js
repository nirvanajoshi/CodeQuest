(function () {
    "use strict";

    const container = document.getElementById("arcade-game");
    if (!container) return;

    const game = container.dataset.game;
    const authenticated = window.ARCADE_AUTHENTICATED === true;
    const resultBox = document.getElementById("arcade-result");
    const attemptForm = document.getElementById("arcade-attempt-form");
    const CARD_SUITS = [
        { symbol: "♠", color: "black" },
        { symbol: "♥", color: "red" },
        { symbol: "♦", color: "red" },
        { symbol: "♣", color: "black" },
    ];

    function createShuffledDeck() {
        const deck = [];
        CARD_SUITS.forEach((suit) => {
            for (let rank = 1; rank <= 13; rank++) deck.push({ suit: suit.symbol, color: suit.color, rank });
        });
        for (let index = deck.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
        }
        return deck;
    }

    function cardRankLabel(rank) {
        return rank === 1 ? "A" : rank === 11 ? "J" : rank === 12 ? "Q" : rank === 13 ? "K" : String(rank);
    }

    function createPlayingCard(card, extraClass) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "playing-card " + (card.color === "red" ? "red-card " : "") + (extraClass || "");
        button.setAttribute("aria-label", cardRankLabel(card.rank) + " of " + card.suit);
        button.innerHTML = "<span class=\"card-corner\"><span>" + cardRankLabel(card.rank) + "</span><span>" + card.suit + "</span></span>" +
            "<span class=\"card-center-suit\" aria-hidden=\"true\">" + card.suit + "</span>";
        return button;
    }

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
        const modeSelect = document.getElementById("snake-mode");

        let snake, direction, pendingDirection, food, score, started, gameOver, startTime, loopTimeout, delay;

        function updateInstructions() {
            const endless = modeSelect.value === "endless";
            overlay.innerHTML = "<p>Press an arrow key or WASD to start</p>" +
                "<span class=\"overlay-sub\">" + (endless ? "Endless mode: edges wrap around" : "Classic mode: avoid the walls") + "</span>";
        }

        function reset() {
            clearTimeout(loopTimeout);
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
            updateInstructions();
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
            const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            background.addColorStop(0, "#102b29");
            background.addColorStop(0.5, "#0c201f");
            background.addColorStop(1, "#111b22");
            ctx.fillStyle = background;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "rgba(133, 190, 155, 0.035)";
            for (let y = 0; y < GRID; y++) {
                for (let x = 0; x < GRID; x++) {
                    if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
                }
            }

            ctx.strokeStyle = "rgba(187, 226, 192, 0.08)";
            ctx.lineWidth = 1;
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

            const pulse = 0.94 + Math.sin(Date.now() / 190) * 0.06;
            const fruitX = food.x * CELL + CELL / 2;
            const fruitY = food.y * CELL + CELL / 2;
            ctx.save();
            ctx.translate(fruitX, fruitY);
            ctx.scale(pulse, pulse);
            ctx.shadowColor = "rgba(255, 105, 88, 0.7)";
            ctx.shadowBlur = 13;
            const fruitGradient = ctx.createRadialGradient(-3, -4, 1, 0, 0, 9);
            fruitGradient.addColorStop(0, "#ffb19b");
            fruitGradient.addColorStop(0.48, "#f45b50");
            fruitGradient.addColorStop(1, "#a92439");
            ctx.fillStyle = fruitGradient;
            ctx.beginPath();
            ctx.ellipse(0, 1, 7, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "#68452e";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.quadraticCurveTo(1, -10, 4, -10);
            ctx.stroke();
            ctx.fillStyle = "#77c66e";
            ctx.beginPath();
            ctx.ellipse(4, -8, 4, 2, -0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            snake.forEach((seg, i) => {
                const isHead = i === 0;
                const size = isHead ? CELL - 2 : Math.max(13, CELL - 4 - Math.min(i, 6) * 0.45);
                const inset = (CELL - size) / 2;
                const x = seg.x * CELL + inset;
                const y = seg.y * CELL + inset;

                ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
                roundedRect(x + 1, y + 2, size, size, isHead ? 7 : 6);
                const bodyGradient = ctx.createLinearGradient(x, y, x + size, y + size);
                if (isHead) {
                    bodyGradient.addColorStop(0, "#c4f08b");
                    bodyGradient.addColorStop(0.45, "#72cf72");
                    bodyGradient.addColorStop(1, "#34955e");
                } else {
                    bodyGradient.addColorStop(0, i % 2 ? "#62c879" : "#75d184");
                    bodyGradient.addColorStop(0.55, "#38a96a");
                    bodyGradient.addColorStop(1, "#227450");
                }
                ctx.fillStyle = bodyGradient;
                roundedRect(x, y, size, size, isHead ? 7 : 6);
                ctx.strokeStyle = "rgba(196, 245, 174, 0.25)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x + 4, y + 4);
                ctx.quadraticCurveTo(x + size / 2, y + 2, x + size - 4, y + 4);
                ctx.stroke();

                if (isHead) {
                    const eyeForwardX = direction.dx * 3;
                    const eyeForwardY = direction.dy * 3;
                    const eyeSideX = -direction.dy * 4;
                    const eyeSideY = direction.dx * 4;
                    [-1, 1].forEach((side) => {
                        const eyeX = seg.x * CELL + CELL / 2 + eyeForwardX + eyeSideX * side;
                        const eyeY = seg.y * CELL + CELL / 2 + eyeForwardY + eyeSideY * side;
                        ctx.fillStyle = "#f4ffe4";
                        ctx.beginPath();
                        ctx.arc(eyeX, eyeY, 2.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = "#183d30";
                        ctx.beginPath();
                        ctx.arc(eyeX + direction.dx, eyeY + direction.dy, 1.2, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }
            });
        }

        function tick() {
            direction = pendingDirection;
            const head = { x: snake[0].x + direction.dx, y: snake[0].y + direction.dy };
            const endless = modeSelect.value === "endless";
            if (endless) {
                head.x = (head.x + GRID) % GRID;
                head.y = (head.y + GRID) % GRID;
            }

            const hitWall = !endless && (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID);
            const hitSelf = snake.some((s) => s.x === head.x && s.y === head.y);

            if (hitWall || hitSelf) {
                gameOver = true;
                const durationSeconds = startTime ? (Date.now() - startTime) / 1000 : 0;
                finish(score, (endless ? "Endless" : "Classic") + " · Length " + snake.length, durationSeconds);
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

        modeSelect.addEventListener("change", reset);
        reset();
    }

    // -----------------------------------------------------------------
    // Minesweeper
    // -----------------------------------------------------------------

    function initMinesweeper() {
        document.getElementById("minesweeper-wrap").hidden = false;

        const difficultySelect = document.getElementById("minesweeper-difficulty");
        const board = document.getElementById("minesweeper-board");
        const minesEl = document.getElementById("minesweeper-mines");
        const timerEl = document.getElementById("minesweeper-timer");
        const statusEl = document.getElementById("minesweeper-status");
        const flagToggle = document.getElementById("minesweeper-flag-toggle");
        const settings = {
            beginner: { label: "Beginner", columns: 9, rows: 9, mines: 10 },
            intermediate: { label: "Intermediate", columns: 16, rows: 16, mines: 40 },
            expert: { label: "Expert", columns: 30, rows: 16, mines: 99 },
        };

        let config, cells, flags, revealed, startedAt, timerInterval, finished, flagMode;

        function neighbors(index) {
            const x = index % config.columns;
            const y = Math.floor(index / config.columns);
            const result = [];
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < config.columns && ny >= 0 && ny < config.rows) {
                        result.push(ny * config.columns + nx);
                    }
                }
            }
            return result;
        }

        function updateMineCount() {
            minesEl.textContent = String(config.mines - flags);
        }

        function updateTimer() {
            timerEl.textContent = String(Math.floor((Date.now() - startedAt) / 1000));
        }

        function startTimer() {
            if (startedAt !== null) return;
            startedAt = Date.now();
            statusEl.textContent = "In progress";
            timerInterval = setInterval(updateTimer, 250);
        }

        function stopTimer() {
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = null;
        }

        function refreshCell(index) {
            const cell = cells[index];
            const button = cell.button;
            button.className = "minesweeper-cell";
            button.disabled = finished || cell.revealed;
            if (cell.flagged) {
                button.classList.add("flagged");
                button.textContent = "⚑";
                button.setAttribute("aria-label", "Flagged cell");
            } else if (cell.revealed) {
                button.classList.add("revealed");
                if (cell.mine) {
                    button.classList.add("mine");
                    button.textContent = "✹";
                    button.setAttribute("aria-label", "Mine");
                } else {
                    button.textContent = cell.count ? String(cell.count) : "";
                    if (cell.count) button.classList.add("number-" + cell.count);
                    button.setAttribute("aria-label", cell.count ? cell.count + " neighboring mines" : "Empty cell");
                }
            } else {
                button.textContent = "";
                button.setAttribute("aria-label", "Hidden cell");
            }
        }

        function recalculateCounts() {
            cells.forEach((cell, index) => {
                cell.count = cell.mine ? 0 : neighbors(index).filter((neighbor) => cells[neighbor].mine).length;
            });
        }

        function ensureSafeFirstClick(index) {
            if (!cells[index].mine) return;
            const safeIndex = cells.findIndex((cell, candidate) =>
                !cell.mine && cell.count === 0 && candidate !== index && !neighbors(index).includes(candidate)
            );
            if (safeIndex < 0) return;
            cells[index].mine = false;
            cells[safeIndex].mine = true;
            recalculateCounts();
        }

        function finishGame(won, reason) {
            if (finished) return;
            finished = true;
            flagToggle.disabled = true;
            stopTimer();
            cells.forEach((cell, index) => {
                if (cell.mine) cell.revealed = true;
                refreshCell(index);
            });
            const duration = startedAt === null ? 0 : (Date.now() - startedAt) / 1000;
            const elapsed = Math.floor(duration);
            const score = won ? Math.max(100, config.mines * 20 + 1000 - elapsed * 2) : 0;
            statusEl.textContent = won ? "Board cleared" : reason;
            finish(score, config.label + (won ? " cleared" : " · " + reason), duration);
        }

        function reveal(index) {
            if (finished || cells[index].revealed || cells[index].flagged) return;
            startTimer();
            if (revealed === 0) ensureSafeFirstClick(index);
            if (cells[index].mine) {
                cells[index].revealed = true;
                revealed++;
                finishGame(false, "Mine hit");
                return;
            }

            const pending = [index];
            while (pending.length) {
                const current = pending.pop();
                const cell = cells[current];
                if (cell.revealed || cell.flagged || cell.mine) continue;
                cell.revealed = true;
                revealed++;
                if (cell.count === 0) {
                    neighbors(current).forEach((neighbor) => {
                        if (!cells[neighbor].revealed && !cells[neighbor].flagged) pending.push(neighbor);
                    });
                }
            }

            cells.forEach((cell, cellIndex) => {
                if (cell.revealed) refreshCell(cellIndex);
            });
            if (revealed === cells.length - config.mines) finishGame(true, "Board cleared");
        }

        function toggleFlag(index, event) {
            if (event) event.preventDefault();
            if (finished || cells[index].revealed) return;
            if (!cells[index].flagged && flags >= config.mines) return;
            cells[index].flagged = !cells[index].flagged;
            flags += cells[index].flagged ? 1 : -1;
            updateMineCount();
            refreshCell(index);
        }

        function reset() {
            stopTimer();
            config = settings[difficultySelect.value];
            cells = Array.from({ length: config.columns * config.rows }, () => ({
                mine: false, count: 0, revealed: false, flagged: false, button: null,
            }));
            flags = 0;
            revealed = 0;
            startedAt = null;
            finished = false;
            flagMode = false;
            flagToggle.disabled = false;
            flagToggle.setAttribute("aria-pressed", "false");
            flagToggle.textContent = "Flag mode: off";
            timerEl.textContent = "0";
            statusEl.textContent = "Click a cell to begin";
            board.style.setProperty("--minesweeper-columns", config.columns);
            board.setAttribute("aria-label", config.label + " Minesweeper board");
            board.innerHTML = "";

            let placed = 0;
            while (placed < config.mines) {
                const index = Math.floor(Math.random() * cells.length);
                if (cells[index].mine) continue;
                cells[index].mine = true;
                placed++;
            }
            recalculateCounts();

            cells.forEach((cell, index) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "minesweeper-cell";
                button.setAttribute("aria-label", "Hidden cell");
                button.addEventListener("click", () => {
                    if (flagMode) toggleFlag(index);
                    else reveal(index);
                });
                button.addEventListener("contextmenu", (event) => toggleFlag(index, event));
                cell.button = button;
                board.appendChild(button);
            });
            updateMineCount();
        }

        flagToggle.addEventListener("click", () => {
            flagMode = !flagMode;
            flagToggle.setAttribute("aria-pressed", String(flagMode));
            flagToggle.textContent = "Flag mode: " + (flagMode ? "on" : "off");
            statusEl.textContent = flagMode ? "Flag mode on" : (startedAt === null ? "Click a cell to begin" : "In progress");
        });
        difficultySelect.addEventListener("change", reset);
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
    // Blackjack
    // -----------------------------------------------------------------

    function initBlackjack() {
        document.getElementById("blackjack-wrap").hidden = false;

        const dealerHand = document.getElementById("blackjack-dealer-hand");
        const playerHand = document.getElementById("blackjack-player-hand");
        const dealerScoreEl = document.getElementById("blackjack-dealer-score");
        const playerScoreEl = document.getElementById("blackjack-player-score");
        const roundEl = document.getElementById("blackjack-round");
        const scoreEl = document.getElementById("blackjack-score");
        const recordEl = document.getElementById("blackjack-record");
        const statusEl = document.getElementById("blackjack-status");
        const dealButton = document.getElementById("blackjack-deal");
        const hitButton = document.getElementById("blackjack-hit");
        const standButton = document.getElementById("blackjack-stand");
        const totalHands = 5;

        let deck = [];
        let dealer = [];
        let player = [];
        let rounds = 0;
        let points = 0;
        let wins = 0;
        let losses = 0;
        let pushes = 0;
        let active = false;
        let matchStartedAt = null;
        let complete = false;

        function drawCard() {
            return deck.pop();
        }

        function handValue(hand) {
            let total = 0;
            let aces = 0;
            hand.forEach((card) => {
                if (card.rank === 1) {
                    total += 11;
                    aces++;
                } else {
                    total += Math.min(card.rank, 10);
                }
            });
            while (total > 21 && aces > 0) {
                total -= 10;
                aces--;
            }
            return total;
        }

        function showHand(element, hand, hideHoleCard) {
            element.innerHTML = "";
            hand.forEach((card, index) => {
                if (hideHoleCard && index === 1) {
                    const back = document.createElement("span");
                    back.className = "playing-card card-back";
                    back.setAttribute("aria-label", "Hidden dealer card");
                    back.textContent = "✦";
                    element.appendChild(back);
                } else {
                    element.appendChild(createPlayingCard(card));
                }
            });
        }

        function render(hideHoleCard) {
            showHand(dealerHand, dealer, hideHoleCard);
            showHand(playerHand, player, false);
            dealerScoreEl.textContent = dealer.length ? (hideHoleCard ? String(handValue([dealer[0]])) + "+" : String(handValue(dealer))) : "-";
            playerScoreEl.textContent = player.length ? String(handValue(player)) : "-";
            roundEl.innerHTML = rounds + "<small class=\"stat-unit\">/" + totalHands + "</small>";
            scoreEl.textContent = String(points);
            recordEl.textContent = wins + "-" + losses + "-" + pushes;
        }

        function finishMatch() {
            if (complete) return;
            complete = true;
            active = false;
            dealButton.disabled = true;
            hitButton.disabled = true;
            standButton.disabled = true;
            statusEl.textContent = "Match complete · " + wins + " wins, " + losses + " losses, " + pushes + " pushes";
            const duration = (Date.now() - matchStartedAt) / 1000;
            finish(points, wins + " wins, " + losses + " losses, " + pushes + " pushes", duration);
        }

        function settleHand() {
            if (!active) return;
            active = false;
            const playerValue = handValue(player);
            while (playerValue <= 21 && handValue(dealer) < 17) dealer.push(drawCard());
            const dealerValue = handValue(dealer);
            let result;

            if (playerValue > 21) {
                losses++;
                result = "Bust. Dealer wins.";
            } else if (dealerValue > 21 || playerValue > dealerValue) {
                wins++;
                const natural = player.length === 2 && playerValue === 21;
                points += natural ? 200 : 150;
                result = natural ? "Blackjack! You win." : "You win.";
            } else if (playerValue === dealerValue) {
                pushes++;
                points += 50;
                result = "Push. It's a tie.";
            } else {
                losses++;
                result = "Dealer wins.";
            }

            statusEl.textContent = result;
            hitButton.disabled = true;
            standButton.disabled = true;
            dealButton.disabled = false;
            dealButton.textContent = rounds >= totalHands ? "Match complete" : "Deal next hand";
            render(false);
            if (rounds >= totalHands) finishMatch();
        }

        function dealHand() {
            if (active || complete) return;
            if (rounds === 0) matchStartedAt = Date.now();
            deck = createShuffledDeck();
            player = [drawCard(), drawCard()];
            dealer = [drawCard(), drawCard()];
            rounds++;
            active = true;
            dealButton.disabled = true;
            hitButton.disabled = false;
            standButton.disabled = false;
            statusEl.textContent = "Your move";
            render(true);
            if (handValue(player) === 21) settleHand();
        }

        dealButton.addEventListener("click", dealHand);
        hitButton.addEventListener("click", () => {
            if (!active) return;
            player.push(drawCard());
            render(true);
            if (handValue(player) >= 21) settleHand();
        });
        standButton.addEventListener("click", settleHand);
        render(false);
    }

    // -----------------------------------------------------------------
    // Klondike Solitaire
    // -----------------------------------------------------------------

    function initSolitaire() {
        document.getElementById("solitaire-wrap").hidden = false;

        const board = document.getElementById("solitaire-board");
        const stockButton = document.getElementById("solitaire-stock");
        const waste = document.getElementById("solitaire-waste");
        const foundations = document.getElementById("solitaire-foundations");
        const tableau = document.getElementById("solitaire-tableau");
        const scoreEl = document.getElementById("solitaire-score");
        const movesEl = document.getElementById("solitaire-moves");
        const timeEl = document.getElementById("solitaire-time");

        let stock = [];
        let wasteCards = [];
        let columns = [];
        let foundationPiles = {};
        let selected = null;
        let moves = 0;
        let score = 0;
        let startedAt = null;
        let timer = null;
        let finished = false;

        function startTimer() {
            if (startedAt !== null) return;
            startedAt = Date.now();
            timer = setInterval(() => {
                timeEl.textContent = String(Math.floor((Date.now() - startedAt) / 1000));
            }, 1000);
        }

        function moveMade() {
            moves++;
            movesEl.textContent = String(moves);
            scoreEl.textContent = String(score);
        }

        function flipExposedCard(column) {
            if (column.length && !column[column.length - 1].faceUp) column[column.length - 1].faceUp = true;
        }

        function selectedCards() {
            if (!selected) return [];
            if (selected.source === "waste") return wasteCards.length ? [wasteCards[wasteCards.length - 1]] : [];
            return columns[selected.column].slice(selected.index);
        }

        function clearSelection() {
            selected = null;
        }

        function finishGame() {
            if (finished) return;
            finished = true;
            clearInterval(timer);
            const duration = startedAt === null ? 0 : (Date.now() - startedAt) / 1000;
            timeEl.textContent = String(Math.floor(duration));
            score += Math.max(0, 500 - moves * 2 - Math.floor(duration / 10));
            scoreEl.textContent = String(score);
            render();
            finish(score, "Klondike cleared in " + moves + " moves", duration);
        }

        function renderCard(card, source, columnIndex, cardIndex) {
            const button = createPlayingCard(card, card.faceUp ? "" : "card-back");
            button.dataset.cardSource = source;
            if (columnIndex !== null) button.dataset.column = String(columnIndex);
            if (cardIndex !== null) button.dataset.cardIndex = String(cardIndex);
            if (!card.faceUp) {
                button.textContent = "✦";
                button.setAttribute("aria-label", "Face-down card");
            }
            if (selected && source === selected.source &&
                (source === "waste" || (columnIndex === selected.column && cardIndex >= selected.index))) {
                button.classList.add("selected");
            }
            return button;
        }

        function render() {
            waste.innerHTML = "";
            foundations.innerHTML = "";
            tableau.innerHTML = "";
            stockButton.disabled = finished;
            stockButton.textContent = stock.length ? String(stock.length) : "↻";
            stockButton.classList.toggle("solitaire-stock-empty", stock.length === 0);

            if (wasteCards.length) {
                waste.appendChild(renderCard(wasteCards[wasteCards.length - 1], "waste", null, null));
            } else {
                const emptyWaste = document.createElement("span");
                emptyWaste.className = "solitaire-stock-empty";
                emptyWaste.setAttribute("aria-label", "Empty waste pile");
                waste.appendChild(emptyWaste);
            }

            CARD_SUITS.forEach((suit) => {
                const pile = document.createElement("button");
                pile.type = "button";
                pile.className = "solitaire-foundation" + (suit.color === "red" ? " red-card" : "");
                pile.dataset.foundationSuit = suit.symbol;
                pile.setAttribute("aria-label", suit.symbol + " foundation");
                const cards = foundationPiles[suit.symbol];
                if (cards.length) pile.appendChild(renderCard(cards[cards.length - 1], "foundation", null, null));
                else pile.textContent = suit.symbol;
                foundations.appendChild(pile);
            });

            columns.forEach((column, columnIndex) => {
                const columnElement = document.createElement("div");
                columnElement.className = "solitaire-column";
                columnElement.dataset.targetColumn = String(columnIndex);
                columnElement.setAttribute("aria-label", "Tableau column " + (columnIndex + 1));
                if (!column.length) {
                    const empty = document.createElement("button");
                    empty.type = "button";
                    empty.className = "solitaire-empty-column";
                    empty.dataset.targetColumn = String(columnIndex);
                    empty.setAttribute("aria-label", "Empty column " + (columnIndex + 1));
                    empty.textContent = "K";
                    columnElement.appendChild(empty);
                } else {
                    column.forEach((card, cardIndex) => {
                        const cardButton = renderCard(card, "tableau", columnIndex, cardIndex);
                        cardButton.style.zIndex = String(cardIndex + 1);
                        columnElement.appendChild(cardButton);
                    });
                }
                tableau.appendChild(columnElement);
            });
            scoreEl.textContent = String(score);
            movesEl.textContent = String(moves);
        }

        function tryTableauMove(targetColumn) {
            if (!selected || finished) return false;
            const moving = selectedCards();
            const destination = columns[targetColumn];
            if (!moving.length || (selected.source === "tableau" && selected.column === targetColumn)) return false;
            const first = moving[0];
            const top = destination[destination.length - 1];
            const valid = top ? top.faceUp && top.color !== first.color && top.rank === first.rank + 1 : first.rank === 13;
            if (!valid) return false;

            startTimer();
            if (selected.source === "waste") wasteCards.pop();
            else {
                columns[selected.column].splice(selected.index);
                flipExposedCard(columns[selected.column]);
            }
            destination.push(...moving);
            clearSelection();
            moveMade();
            render();
            return true;
        }

        function tryFoundationMove(suitSymbol) {
            if (!selected || finished) return;
            const moving = selectedCards();
            if (moving.length !== 1) return;
            const card = moving[0];
            const pile = foundationPiles[suitSymbol];
            const top = pile[pile.length - 1];
            if (card.suit !== suitSymbol || (top ? card.rank !== top.rank + 1 : card.rank !== 1)) return;

            startTimer();
            if (selected.source === "waste") wasteCards.pop();
            else {
                columns[selected.column].pop();
                flipExposedCard(columns[selected.column]);
            }
            pile.push(card);
            score += 10;
            clearSelection();
            moveMade();
            if (Object.values(foundationPiles).every((cards) => cards.length === 13)) finishGame();
            else render();
        }

        function reset() {
            clearInterval(timer);
            const deck = createShuffledDeck().map((card) => ({ ...card, faceUp: false }));
            columns = Array.from({ length: 7 }, (_, columnIndex) => {
                const column = deck.splice(0, columnIndex + 1);
                column[column.length - 1].faceUp = true;
                return column;
            });
            stock = deck;
            wasteCards = [];
            foundationPiles = Object.fromEntries(CARD_SUITS.map((suit) => [suit.symbol, []]));
            selected = null;
            moves = 0;
            score = 0;
            startedAt = null;
            finished = false;
            timeEl.textContent = "0";
            render();
        }

        stockButton.addEventListener("click", () => {
            if (finished) return;
            clearSelection();
            startTimer();
            if (stock.length) {
                const card = stock.pop();
                card.faceUp = true;
                wasteCards.push(card);
            } else if (wasteCards.length) {
                stock = wasteCards.splice(0).reverse();
                stock.forEach((card) => { card.faceUp = false; });
            }
            else return;
            moveMade();
            render();
        });

        board.addEventListener("click", (event) => {
            const foundationButton = event.target.closest("[data-foundation-suit]");
            if (foundationButton) {
                tryFoundationMove(foundationButton.dataset.foundationSuit);
                return;
            }

            const cardButton = event.target.closest("button[data-card-source]");
            if (cardButton) {
                const source = cardButton.dataset.cardSource;
                if (source === "tableau") {
                    const columnIndex = Number(cardButton.dataset.column);
                    const cardIndex = Number(cardButton.dataset.cardIndex);
                    const column = columns[columnIndex];
                    const card = column[cardIndex];
                    if (!card.faceUp) {
                        if (cardIndex === column.length - 1) {
                            startTimer();
                            card.faceUp = true;
                            clearSelection();
                            moveMade();
                            render();
                        }
                        return;
                    }
                    if (selected && tryTableauMove(columnIndex)) return;
                    selected = selected && selected.source === source && selected.column === columnIndex && selected.index === cardIndex
                        ? null
                        : { source, column: columnIndex, index: cardIndex };
                    render();
                } else if (source === "waste") {
                    selected = selected && selected.source === "waste" ? null : { source: "waste" };
                    render();
                }
                return;
            }

            const targetColumn = event.target.closest("[data-target-column]");
            if (targetColumn) {
                const index = Number(targetColumn.dataset.targetColumn);
                if (!tryTableauMove(index) && selected) {
                    clearSelection();
                    render();
                }
            }
        });

        reset();
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
        const bow = document.getElementById("archery-bow");
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

        function aimBow(pos) {
            const rect = range.getBoundingClientRect();
            const aimX = pos.x * 520 / rect.width;
            const aimY = pos.y * 380 / rect.height;
            const angle = Math.atan2(aimY - 276, aimX - 78) * 180 / Math.PI;
            const forwardAngle = Math.max(-85, Math.min(85, angle));
            bow.setAttribute("transform", "rotate(" + forwardAngle + " 78 276)");
        }

        function moveCrosshair(event) {
            if (busy || arrowsFired >= TOTAL_ARROWS) return;
            const pos = pointerPos(event);
            aimBow(pos);
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
            aimBow(pos);
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
    // Geometry Dash
    // -----------------------------------------------------------------

    function initGeometryDash() {
        document.getElementById("geometry-wrap").hidden = false;

        const canvas = document.getElementById("geometry-canvas");
        const ctx = canvas.getContext("2d");
        const overlay = document.getElementById("geometry-overlay");
        const scoreEl = document.getElementById("geometry-score");
        const speedEl = document.getElementById("geometry-speed");
        const statusEl = document.getElementById("geometry-status");

        const WORLD = { width: canvas.width, height: canvas.height };
        let player;
        let obstacles;
        let stars;
        let score;
        let started;
        let gameOver;
        let lastTime;
        let spawnTimer;
        let speed;

        function reset() {
            player = {
                x: 90,
                y: WORLD.height - 70,
                width: 26,
                height: 26,
                vy: 0,
                onGround: true,
            };
            obstacles = [];
            stars = [];
            for (let i = 0; i < 30; i++) {
                stars.push({ x: Math.random() * WORLD.width, y: Math.random() * 130, r: 1.5 + Math.random() * 2.4 });
            }
            score = 0;
            started = false;
            gameOver = false;
            lastTime = 0;
            spawnTimer = 0;
            speed = 210;
            scoreEl.textContent = "0";
            speedEl.textContent = "1.0x";
            statusEl.textContent = "Ready";
            overlay.hidden = false;
            overlay.innerHTML = "<p>Press space or tap to start</p><span class=\"overlay-sub\">jump over obstacles and stay on rhythm</span>";
            draw();
        }

        function jump() {
            if (!started) {
                started = true;
                overlay.hidden = true;
                statusEl.textContent = "Running";
                lastTime = performance.now();
            }
            if (gameOver) return;
            if (player.onGround) {
                player.vy = -355;
                player.onGround = false;
            }
        }

        function spawnObstacle() {
            const typeRoll = Math.random();
            const width = typeRoll > 0.72 ? 28 : 18 + Math.random() * 28;
            const height = typeRoll > 0.72 ? 34 + Math.random() * 35 : 24 + Math.random() * 18;
            obstacles.push({
                x: WORLD.width + 26,
                y: WORLD.height - height - 24,
                width,
                height,
                color: typeRoll > 0.72 ? "#ff7a7a" : "#ffb347",
            });
        }

        function rectCollision(a, b) {
            return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
        }

        function drawBackground() {
            const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height);
            sky.addColorStop(0, "#2d7af0");
            sky.addColorStop(0.35, "#6bc7ff");
            sky.addColorStop(0.55, "#dff7ff");
            sky.addColorStop(0.56, "#aae57e");
            sky.addColorStop(1, "#3c9d3d");
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, WORLD.width, WORLD.height);

            for (const star of stars) {
                ctx.fillStyle = "rgba(255,255,255,0.8)";
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.fillStyle = "rgba(255,255,255,0.2)";
            for (let i = 0; i < 7; i++) {
                const px = (i * 110 + (score * 0.3) % 120) % (WORLD.width + 120) - 60;
                ctx.beginPath();
                ctx.moveTo(px, 110);
                ctx.lineTo(px + 40, 90);
                ctx.lineTo(px + 80, 110);
                ctx.closePath();
                ctx.fill();
            }

            ctx.fillStyle = "#5ea13d";
            ctx.fillRect(0, WORLD.height - 24, WORLD.width, 24);
            ctx.fillStyle = "rgba(255,255,255,0.12)";
            for (let x = 0; x < WORLD.width; x += 20) {
                ctx.fillRect(x, WORLD.height - 24, 10, 6);
            }
        }

        function drawPlayer() {
            const bodyX = player.x;
            const bodyY = player.y;
            const glow = ctx.createRadialGradient(bodyX + 13, bodyY + 13, 2, bodyX + 13, bodyY + 13, 22);
            glow.addColorStop(0, "#dff9ff");
            glow.addColorStop(0.4, "#7bf0ff");
            glow.addColorStop(1, "rgba(84, 214, 255, 0)");
            ctx.fillStyle = glow;
            ctx.fillRect(bodyX - 8, bodyY - 8, player.width + 20, player.height + 20);

            ctx.fillStyle = "#14d0ff";
            ctx.fillRect(bodyX, bodyY, player.width, player.height);
            ctx.fillStyle = "#0a3a7b";
            ctx.fillRect(bodyX + 5, bodyY + 6, 6, 6);
            ctx.fillRect(bodyX + 15, bodyY + 6, 6, 6);
            ctx.fillStyle = "#fff";
            ctx.fillRect(bodyX + 7, bodyY + 16, 12, 2);
        }

        function drawObstacle(obstacle) {
            ctx.fillStyle = obstacle.color;
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
            ctx.fillRect(obstacle.x, obstacle.y + obstacle.height - 5, obstacle.width, 5);
        }

        function draw() {
            drawBackground();
            for (const obstacle of obstacles) drawObstacle(obstacle);
            drawPlayer();
        }

        function tick(timestamp) {
            if (!started) {
                draw();
                requestAnimationFrame(tick);
                return;
            }

            if (!lastTime) lastTime = timestamp;
            const delta = (timestamp - lastTime) / 1000;
            lastTime = timestamp;

            if (!gameOver) {
                score += delta * 18;
                speed = Math.min(520, 210 + score * 1.8);
                speedEl.textContent = (speed / 210).toFixed(1) + "x";
                scoreEl.textContent = String(Math.floor(score));

                player.vy += 750 * delta;
                player.y += player.vy * delta;
                const floorY = WORLD.height - 24 - player.height;
                if (player.y >= floorY) {
                    player.y = floorY;
                    player.vy = 0;
                    player.onGround = true;
                }

                spawnTimer -= delta;
                if (spawnTimer <= 0) {
                    spawnObstacle();
                    spawnTimer = Math.max(0.9, 1.7 - speed / 500);
                }

                for (let i = obstacles.length - 1; i >= 0; i--) {
                    obstacles[i].x -= speed * delta;
                    if (rectCollision(player, obstacles[i])) {
                        gameOver = true;
                        statusEl.textContent = "Crashed";
                        const durationSeconds = (Date.now() - startTime) / 1000;
                        finish(Math.floor(score), "Distance " + Math.floor(score) + "m", durationSeconds);
                        return;
                    }
                    if (obstacles[i].x + obstacles[i].width < -10) obstacles.splice(i, 1);
                }
            }

            draw();
            if (!gameOver) requestAnimationFrame(tick);
        }

        let startTime = null;
        canvas.addEventListener("pointerdown", () => {
            if (!started) startTime = Date.now();
            jump();
        });
        document.addEventListener("keydown", (event) => {
            if (event.code === "Space" || event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
                event.preventDefault();
                if (!started) startTime = Date.now();
                jump();
            }
        });

        reset();
        requestAnimationFrame(tick);
    }

    // -----------------------------------------------------------------
    // Dinosaur Run
    // -----------------------------------------------------------------

    function initDinosaur() {
        document.getElementById("dinosaur-wrap").hidden = false;

        const canvas = document.getElementById("dinosaur-canvas");
        const ctx = canvas.getContext("2d");
        const overlay = document.getElementById("dinosaur-overlay");
        const scoreEl = document.getElementById("dinosaur-score");
        const speedEl = document.getElementById("dinosaur-speed");
        const statusEl = document.getElementById("dinosaur-status");
        const groundY = 224;
        const dino = { x: 68, y: groundY - 42, width: 42, height: 42, velocityY: 0, grounded: true };
        const clouds = [
            { x: 82, y: 58, scale: 0.9 },
            { x: 285, y: 92, scale: 0.65 },
            { x: 510, y: 48, scale: 0.8 },
        ];
        let obstacles = [];
        let started = false;
        let gameOver = false;
        let score = 0;
        let speed = 285;
        let spawnTimer = 1.1;
        let lastFrame = 0;
        let startTime = null;
        let groundOffset = 0;
        let runFrame = 0;

        function drawCloud(cloud) {
            ctx.save();
            ctx.translate(cloud.x, cloud.y);
            ctx.scale(cloud.scale, cloud.scale);
            ctx.fillStyle = "rgba(255, 255, 255, 0.84)";
            ctx.beginPath();
            ctx.ellipse(0, 8, 25, 8, 0, 0, Math.PI * 2);
            ctx.ellipse(-10, 3, 11, 10, 0, 0, Math.PI * 2);
            ctx.ellipse(2, -2, 14, 13, 0, 0, Math.PI * 2);
            ctx.ellipse(14, 5, 11, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        function drawBackground() {
            const night = Math.floor(score / 700) % 2 === 1;
            const sky = ctx.createLinearGradient(0, 0, 0, groundY);
            sky.addColorStop(0, night ? "#24354b" : "#b9e1e9");
            sky.addColorStop(1, night ? "#d5c9a6" : "#f5f0d9");
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = night ? "#f3e7a0" : "#f3c96c";
            ctx.beginPath();
            ctx.arc(530, 62, 19, 0, Math.PI * 2);
            ctx.fill();

            if (night) {
                ctx.fillStyle = "rgba(255, 250, 214, 0.8)";
                for (let i = 0; i < 18; i++) {
                    const x = (i * 47 + 19) % canvas.width;
                    const y = 20 + (i * 31) % 90;
                    ctx.fillRect(x, y, 2, 2);
                }
            } else {
                for (const cloud of clouds) drawCloud(cloud);
            }

            ctx.fillStyle = night ? "#a59d78" : "#d9c58c";
            ctx.beginPath();
            ctx.moveTo(0, groundY - 27);
            ctx.lineTo(90, groundY - 53);
            ctx.lineTo(184, groundY - 28);
            ctx.lineTo(296, groundY - 62);
            ctx.lineTo(405, groundY - 30);
            ctx.lineTo(520, groundY - 54);
            ctx.lineTo(canvas.width, groundY - 28);
            ctx.lineTo(canvas.width, groundY);
            ctx.lineTo(0, groundY);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = night ? "#ded6bd" : "#f5eed6";
            ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.fillStyle = night ? "#817a64" : "#9f966e";
            ctx.fillRect(0, groundY, canvas.width, 2);
            ctx.fillStyle = night ? "#b0a585" : "#c6bb8e";
            for (let x = -groundOffset; x < canvas.width; x += 42) {
                ctx.fillRect(x, groundY + 15, 14, 2);
                ctx.fillRect(x + 22, groundY + 29, 4, 2);
            }

            for (const cloud of clouds) {
                cloud.x -= speed * 0.035 / 60;
                if (cloud.x < -40) cloud.x = canvas.width + 35;
            }
        }

        function drawDinosaur() {
            const x = dino.x;
            const y = dino.y;
            const color = Math.floor(score / 700) % 2 === 1 ? "#354b4b" : "#485b50";
            const legSwing = dino.grounded && started ? Math.sin(runFrame * 0.32) * 4 : 0;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(x + 4, y + 26);
            ctx.lineTo(x - 10, y + 20);
            ctx.lineTo(x + 5, y + 18);
            ctx.lineTo(x + 12, y + 22);
            ctx.lineTo(x + 20, y + 22);
            ctx.lineTo(x + 23, y + 11);
            ctx.lineTo(x + 32, y + 3);
            ctx.lineTo(x + 47, y + 4);
            ctx.lineTo(x + 50, y + 16);
            ctx.lineTo(x + 44, y + 21);
            ctx.lineTo(x + 40, y + 37);
            ctx.lineTo(x + 34, y + 37);
            ctx.lineTo(x + 34, y + 28);
            ctx.lineTo(x + 25, y + 29);
            ctx.lineTo(x + 23, y + 40);
            ctx.lineTo(x + 17, y + 40);
            ctx.lineTo(x + 17, y + 29);
            ctx.lineTo(x + 9, y + 30);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "#f4f0d9";
            ctx.fillRect(x + 40, y + 9, 3, 3);
            ctx.fillStyle = color;
            ctx.fillRect(x + 25, y + 25, 3, 6);
            ctx.fillRect(x + 20, y + 36 + legSwing, 4, 7 - Math.abs(legSwing));
            ctx.fillRect(x + 34, y + 34 - legSwing, 4, 7 - Math.abs(legSwing));
        }

        function drawCactus(obstacle) {
            ctx.fillStyle = obstacle.tone;
            const segments = obstacle.segments;
            for (let i = 0; i < segments; i++) {
                const x = obstacle.x + i * 13;
                const h = obstacle.height - (i % 2) * 7;
                ctx.fillRect(x + 4, groundY - h, 9, h);
                ctx.fillRect(x, groundY - h + 10, 6, 5);
                ctx.fillRect(x, groundY - h + 5, 5, 11);
                ctx.fillRect(x + 12, groundY - h + 17, 6, 5);
                ctx.fillRect(x + 13, groundY - h + 12, 5, 12);
                ctx.fillStyle = "rgba(239, 240, 194, 0.42)";
                ctx.fillRect(x + 6, groundY - h + 5, 2, h - 7);
                ctx.fillStyle = obstacle.tone;
            }
        }

        function drawBird(obstacle) {
            const wing = Math.sin(runFrame * 0.3) * 5;
            ctx.fillStyle = "#596760";
            ctx.fillRect(obstacle.x + 5, obstacle.y + 8, 24, 8);
            ctx.fillRect(obstacle.x + 25, obstacle.y + 6, 8, 6);
            ctx.fillStyle = "#c47e55";
            ctx.beginPath();
            ctx.moveTo(obstacle.x + 32, obstacle.y + 8);
            ctx.lineTo(obstacle.x + 39, obstacle.y + 11);
            ctx.lineTo(obstacle.x + 32, obstacle.y + 13);
            ctx.fill();
            ctx.fillStyle = "#596760";
            ctx.beginPath();
            ctx.moveTo(obstacle.x + 15, obstacle.y + 9);
            ctx.lineTo(obstacle.x + 9, obstacle.y + wing);
            ctx.lineTo(obstacle.x + 24, obstacle.y + 9);
            ctx.fill();
        }

        function draw() {
            drawBackground();
            for (const obstacle of obstacles) {
                if (obstacle.type === "bird") drawBird(obstacle);
                else drawCactus(obstacle);
            }
            drawDinosaur();
            scoreEl.textContent = String(Math.floor(score));
        }

        function spawnObstacle() {
            if (score > 450 && Math.random() < 0.24) {
                obstacles.push({ x: canvas.width + 20, y: groundY - 76 - Math.random() * 22, width: 40, height: 20, type: "bird" });
                return;
            }
            const segments = score > 900 && Math.random() > 0.68 ? 2 + Math.floor(Math.random() * 2) : 1;
            obstacles.push({
                x: canvas.width + 20,
                y: groundY - (34 + Math.random() * 16),
                width: 18 + (segments - 1) * 13,
                height: 34 + Math.random() * 16,
                type: "cactus",
                segments,
                tone: Math.floor(score / 700) % 2 === 1 ? "#526b58" : "#637b5d",
            });
        }

        function collides(obstacle) {
            const playerBox = { x: dino.x + 5, y: dino.y + 5, width: dino.width - 10, height: dino.height - 7 };
            const obstacleBox = obstacle.type === "bird"
                ? { x: obstacle.x + 4, y: obstacle.y + 4, width: obstacle.width - 8, height: obstacle.height - 6 }
                : { x: obstacle.x + 2, y: groundY - obstacle.height + 8, width: obstacle.width - 4, height: obstacle.height - 8 };
            return playerBox.x < obstacleBox.x + obstacleBox.width &&
                playerBox.x + playerBox.width > obstacleBox.x &&
                playerBox.y < obstacleBox.y + obstacleBox.height &&
                playerBox.y + playerBox.height > obstacleBox.y;
        }

        function endGame() {
            if (gameOver) return;
            gameOver = true;
            statusEl.textContent = "Finished";
            finish(Math.floor(score), "Distance " + Math.floor(score) + "m", (Date.now() - startTime) / 1000);
        }

        function jump() {
            if (gameOver) return;
            if (!started) {
                started = true;
                startTime = Date.now();
                lastFrame = performance.now();
                overlay.hidden = true;
                statusEl.textContent = "Running";
            }
            if (dino.grounded) {
                dino.velocityY = -510;
                dino.grounded = false;
            }
        }

        function tick(timestamp) {
            if (!started || gameOver) {
                draw();
                requestAnimationFrame(tick);
                return;
            }

            const delta = Math.min((timestamp - lastFrame) / 1000 || 0, 0.04);
            lastFrame = timestamp;
            runFrame++;
            score += delta * 12;
            speed = Math.min(620, 285 + score * 0.55);
            speedEl.textContent = (speed / 285).toFixed(1) + "x";
            groundOffset = (groundOffset + speed * delta) % 42;

            dino.velocityY += 1450 * delta;
            dino.y += dino.velocityY * delta;
            const floor = groundY - dino.height;
            if (dino.y >= floor) {
                dino.y = floor;
                dino.velocityY = 0;
                dino.grounded = true;
            }

            spawnTimer -= delta;
            if (spawnTimer <= 0) {
                spawnObstacle();
                spawnTimer = Math.max(0.78, 1.35 + Math.random() * 0.55 - score / 2200);
            }

            for (let index = obstacles.length - 1; index >= 0; index--) {
                const obstacle = obstacles[index];
                obstacle.x -= speed * delta;
                if (collides(obstacle)) {
                    endGame();
                    break;
                }
                if (obstacle.x + obstacle.width < -10) obstacles.splice(index, 1);
            }

            draw();
            if (!gameOver) requestAnimationFrame(tick);
        }

        canvas.addEventListener("pointerdown", jump);
        document.addEventListener("keydown", (event) => {
            if ((event.code === "Space" || event.code === "ArrowUp") && !event.repeat) {
                event.preventDefault();
                jump();
            }
        });

        draw();
        requestAnimationFrame(tick);
    }

    // -----------------------------------------------------------------
    // Tetris
    // -----------------------------------------------------------------

    function initTetris() {
        document.getElementById("tetris-wrap").hidden = false;

        const COLS = 10;
        const ROWS = 20;
        const CELL = 30;
        const canvas = document.getElementById("tetris-canvas");
        const ctx = canvas.getContext("2d");
        const nextCanvas = document.getElementById("tetris-next");
        const nextCtx = nextCanvas.getContext("2d");
        const overlay = document.getElementById("tetris-overlay");
        const scoreEl = document.getElementById("tetris-score");
        const linesEl = document.getElementById("tetris-lines");
        const levelEl = document.getElementById("tetris-level");
        const COLORS = ["#36c9a2", "#53a9e8", "#f2bf4b", "#a886e8", "#ed765f", "#69c86f", "#ed6bb0"];
        const SHAPES = [
            [[1, 1, 1, 1]],
            [[1, 0, 0], [1, 1, 1]],
            [[0, 0, 1], [1, 1, 1]],
            [[1, 1], [1, 1]],
            [[0, 1, 1], [1, 1, 0]],
            [[0, 1, 0], [1, 1, 1]],
            [[1, 1, 0], [0, 1, 1]],
        ];

        let board;
        let current;
        let next;
        let score;
        let lines;
        let level;
        let started = false;
        let gameOver = false;
        let startTime = null;
        let fallTimer = null;

        function newPiece() {
            const index = Math.floor(Math.random() * SHAPES.length);
            return {
                shape: SHAPES[index].map((row) => row.slice()),
                color: COLORS[index],
                x: Math.floor((COLS - SHAPES[index][0].length) / 2),
                y: 0,
            };
        }

        function drawCell(context, x, y, size, color) {
            context.fillStyle = color;
            context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
            context.fillStyle = "rgba(255, 255, 255, 0.2)";
            context.fillRect(x * size + 2, y * size + 2, size - 4, 3);
            context.strokeStyle = "rgba(10, 18, 24, 0.5)";
            context.strokeRect(x * size + 1.5, y * size + 1.5, size - 3, size - 3);
        }

        function draw() {
            ctx.fillStyle = "#111820";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.055)";
            ctx.lineWidth = 1;
            for (let x = 0; x <= COLS; x++) {
                ctx.beginPath();
                ctx.moveTo(x * CELL + 0.5, 0);
                ctx.lineTo(x * CELL + 0.5, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y <= ROWS; y++) {
                ctx.beginPath();
                ctx.moveTo(0, y * CELL + 0.5);
                ctx.lineTo(canvas.width, y * CELL + 0.5);
                ctx.stroke();
            }
            board.forEach((row, y) => row.forEach((color, x) => {
                if (color) drawCell(ctx, x, y, CELL, color);
            }));
            current.shape.forEach((row, y) => row.forEach((filled, x) => {
                if (filled && current.y + y >= 0) {
                    drawCell(ctx, current.x + x, current.y + y, CELL, current.color);
                }
            }));
            drawNext();
        }

        function drawNext() {
            nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
            const width = next.shape[0].length;
            const height = next.shape.length;
            const size = 22;
            const offsetX = Math.floor((nextCanvas.width - width * size) / 2);
            const offsetY = Math.floor((nextCanvas.height - height * size) / 2);
            next.shape.forEach((row, y) => row.forEach((filled, x) => {
                if (!filled) return;
                nextCtx.fillStyle = next.color;
                nextCtx.fillRect(offsetX + x * size + 1, offsetY + y * size + 1, size - 2, size - 2);
                nextCtx.fillStyle = "rgba(255, 255, 255, 0.2)";
                nextCtx.fillRect(offsetX + x * size + 2, offsetY + y * size + 2, size - 4, 3);
            }));
        }

        function collides(shape, x, y) {
            return shape.some((row, rowIndex) => row.some((filled, colIndex) => {
                if (!filled) return false;
                const boardX = x + colIndex;
                const boardY = y + rowIndex;
                return boardX < 0 || boardX >= COLS || boardY >= ROWS ||
                    (boardY >= 0 && board[boardY][boardX]);
            }));
        }

        function rotate() {
            const height = current.shape.length;
            const width = current.shape[0].length;
            const rotated = Array.from({ length: width }, (_, row) =>
                Array.from({ length: height }, (_, col) => current.shape[height - 1 - col][row])
            );
            if (!collides(rotated, current.x, current.y)) current.shape = rotated;
            draw();
        }

        function updateScore() {
            scoreEl.textContent = String(score);
            linesEl.textContent = String(lines);
            levelEl.textContent = String(level);
        }

        function endGame() {
            if (gameOver) return;
            gameOver = true;
            clearTimeout(fallTimer);
            const durationSeconds = (Date.now() - startTime) / 1000;
            finish(score, lines + " lines · level " + level, durationSeconds);
        }

        function spawn() {
            current = { ...next, shape: next.shape.map((row) => row.slice()) };
            current.x = Math.floor((COLS - current.shape[0].length) / 2);
            current.y = 0;
            next = newPiece();
            if (collides(current.shape, current.x, current.y)) endGame();
        }

        function lockPiece() {
            current.shape.forEach((row, y) => row.forEach((filled, x) => {
                if (filled && current.y + y >= 0) board[current.y + y][current.x + x] = current.color;
            }));
            let cleared = 0;
            board = board.filter((row) => {
                if (row.every(Boolean)) {
                    cleared++;
                    return false;
                }
                return true;
            });
            while (board.length < ROWS) board.unshift(Array(COLS).fill(0));
            if (cleared) {
                lines += cleared;
                score += [0, 100, 300, 500, 800][cleared] * level;
                level = Math.floor(lines / 10) + 1;
                updateScore();
            }
            spawn();
            draw();
        }

        function dropOne() {
            if (gameOver) return;
            if (!collides(current.shape, current.x, current.y + 1)) {
                current.y++;
            } else {
                lockPiece();
            }
            draw();
        }

        function start() {
            if (started || gameOver) return;
            started = true;
            startTime = Date.now();
            overlay.hidden = true;
            scheduleFall();
        }

        function scheduleFall() {
            clearTimeout(fallTimer);
            if (!started || gameOver) return;
            fallTimer = setTimeout(() => {
                dropOne();
                scheduleFall();
            }, Math.max(100, 700 - (level - 1) * 55));
        }

        function act(action) {
            if (gameOver) return;
            start();
            if (action === "left" && !collides(current.shape, current.x - 1, current.y)) current.x--;
            if (action === "right" && !collides(current.shape, current.x + 1, current.y)) current.x++;
            if (action === "rotate") return rotate();
            if (action === "down") {
                if (!collides(current.shape, current.x, current.y + 1)) {
                    current.y++;
                    score++;
                    updateScore();
                } else {
                    lockPiece();
                }
            }
            if (action === "drop") {
                let distance = 0;
                while (!collides(current.shape, current.x, current.y + 1)) {
                    current.y++;
                    distance++;
                }
                score += distance * 2;
                updateScore();
                lockPiece();
            }
            draw();
        }

        document.addEventListener("keydown", (event) => {
            const actions = {
                ArrowLeft: "left",
                ArrowRight: "right",
                ArrowDown: "down",
                ArrowUp: "rotate",
                " ": "drop",
                x: "rotate",
                X: "rotate",
            };
            const action = actions[event.key];
            if (!action) return;
            event.preventDefault();
            act(action);
        });

        document.querySelectorAll("[data-tetris-action]").forEach((button) => {
            button.addEventListener("click", () => act(button.dataset.tetrisAction));
        });
        canvas.addEventListener("pointerdown", start);

        board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        score = 0;
        lines = 0;
        level = 1;
        next = newPiece();
        spawn();
        updateScore();
        draw();
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

    // -----------------------------------------------------------------
    // Bounce (manual platforming: direct movement and a double jump)
    // -----------------------------------------------------------------

    function initBounce() {
        document.getElementById("bounce-wrap").hidden = false;

        const canvas = document.getElementById("bounce-canvas");
        const ctx = canvas.getContext("2d");
        const overlay = document.getElementById("bounce-overlay");
        const scoreEl = document.getElementById("bounce-score");
        const levelEl = document.getElementById("bounce-level");
        const ringsEl = document.getElementById("bounce-rings");

        const TILE_W = 40;
        const GROUND_Y = canvas.height - 50;
        const BALL_R = 14;
        const BALL_SCREEN_X = 120;
        const RING_R = 10;
        const GRAVITY = 1900;
        const WALL_RESTITUTION = 0.75;
        const JUMP_IMPULSE = 700;
        const MOVE_SPEED = 260;
        const VX_ACCEL = 1100;
        const VX_FRICTION = 1400;
        const MAX_JUMPS = 2;
        const RUNWAY = 8;

        // '.' safe  'x' spike  '_' gap  'o' safe+ring  'w' short wall  'W' tall wall  'F' flag/finish
        const WALL_HEIGHT = { w: 70, W: 130 };
        const LEVELS = [
            "..........x....o.........__..x.x....o........w.......F",
            "......o...x__x....w.....x...o....__x..W....o......x..F",
            "..o.......x.W...__..x..o....x__x....w...x.o...W....x.F",
        ];

        function buildLevel(index) {
            const layout = LEVELS[index % LEVELS.length];
            const tiles = [];
            for (let i = 0; i < RUNWAY; i++) {
                tiles.push({ type: "safe", ring: false, collected: false, wallHeight: 0 });
            }
            for (let i = 0; i < layout.length; i++) {
                const ch = layout[i];
                if (ch === "x") tiles.push({ type: "spike", ring: false, collected: false, wallHeight: 0 });
                else if (ch === "_") tiles.push({ type: "gap", ring: false, collected: false, wallHeight: 0 });
                else if (ch === "o") tiles.push({ type: "safe", ring: true, collected: false, wallHeight: 0 });
                else if (ch === "F") tiles.push({ type: "flag", ring: false, collected: false, wallHeight: 0 });
                else if (ch === "w" || ch === "W") tiles.push({ type: "safe", ring: false, collected: false, wallHeight: WALL_HEIGHT[ch] });
                else tiles.push({ type: "safe", ring: false, collected: false, wallHeight: 0 });
            }
            return tiles;
        }

        function tileAt(index) {
            return tiles[Math.max(0, Math.min(tiles.length - 1, index))];
        }

        let levelIndex, tiles, ballWorldX, ballY, vy, vx, leftHeld, rightHeld, jumpsRemaining, levelComplete;
        let score, ringsCollected, progressScore, levelBonus;
        let started, gameOver, startTime, lastTime, rafId;

        function loadLevel(index) {
            levelIndex = index;
            tiles = buildLevel(index);
            ballWorldX = 0;
            ballY = GROUND_Y - BALL_R;
            vy = 0;
            vx = 0;
            leftHeld = false;
            rightHeld = false;
            jumpsRemaining = MAX_JUMPS;
            levelComplete = false;
            levelEl.textContent = (index + 1) + "/" + LEVELS.length;
        }

        function reset() {
            score = 0;
            ringsCollected = 0;
            progressScore = 0;
            levelBonus = 0;
            started = false;
            gameOver = false;
            startTime = null;
            lastTime = null;
            scoreEl.textContent = "0";
            ringsEl.textContent = "0";
            overlay.hidden = false;
            overlay.innerHTML = "<p>Use the controls to start</p>" +
                "<span class=\"overlay-sub\">&larr;/&rarr; move &middot; Space / &uarr; jump twice &middot; reach the flag</span>";
            loadLevel(0);
            draw();
        }

        function beginIfNeeded() {
            if (started || gameOver) return;
            started = true;
            startTime = Date.now();
            overlay.hidden = true;
        }

        function jump() {
            if (gameOver || levelComplete) return;
            if (jumpsRemaining <= 0) return;
            beginIfNeeded();
            vy = -JUMP_IMPULSE;
            jumpsRemaining--;
        }

        function endGame(reason) {
            if (gameOver) return;
            gameOver = true;
            cancelAnimationFrame(rafId);
            const durationSeconds = startTime ? (Date.now() - startTime) / 1000 : 0;
            const detail = "Level " + (levelIndex + 1) + "/" + LEVELS.length + " · " + ringsCollected + " rings · " + reason;
            finish(score, detail, durationSeconds);
        }

        function completeLevel() {
            if (gameOver || levelComplete) return;
            levelComplete = true;
            levelBonus += 100 + levelIndex * 25;
            score = Math.round(progressScore) + ringsCollected * 25 + levelBonus;
            scoreEl.textContent = String(score);

            const isLast = levelIndex >= LEVELS.length - 1;
            if (isLast) {
                cancelAnimationFrame(rafId);
                const durationSeconds = startTime ? (Date.now() - startTime) / 1000 : 0;
                finish(score, "Cleared all " + LEVELS.length + " levels · " + ringsCollected + " rings", durationSeconds);
                return;
            }

            overlay.hidden = false;
            overlay.innerHTML = "<p>Level " + (levelIndex + 1) + " complete!</p>" +
                "<span class=\"overlay-sub\">Next level starting…</span>";
            setTimeout(() => {
                if (gameOver) return;
                loadLevel(levelIndex + 1);
                overlay.hidden = true;
            }, 1100);
        }

        function drawSpike(screenX, topY) {
            ctx.fillStyle = "#e03131";
            ctx.beginPath();
            ctx.moveTo(screenX, topY);
            ctx.lineTo(screenX + TILE_W / 2, topY - 26);
            ctx.lineTo(screenX + TILE_W, topY);
            ctx.closePath();
            ctx.fill();
        }

        function drawWall(screenX, height) {
            ctx.fillStyle = "#495057";
            ctx.fillRect(screenX - 4, GROUND_Y - height, 8, height);
            ctx.fillStyle = "#adb5bd";
            ctx.fillRect(screenX - 6, GROUND_Y - height - 6, 12, 6);
        }

        function drawFlag(screenX) {
            const poleH = 90;
            ctx.strokeStyle = "#495057";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(screenX + TILE_W / 2, GROUND_Y);
            ctx.lineTo(screenX + TILE_W / 2, GROUND_Y - poleH);
            ctx.stroke();
            ctx.fillStyle = "#37b24d";
            ctx.beginPath();
            ctx.moveTo(screenX + TILE_W / 2, GROUND_Y - poleH);
            ctx.lineTo(screenX + TILE_W / 2 + 26, GROUND_Y - poleH + 10);
            ctx.lineTo(screenX + TILE_W / 2, GROUND_Y - poleH + 20);
            ctx.closePath();
            ctx.fill();
        }

        function draw() {
            ctx.fillStyle = "#7ec8f2";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "rgba(255,255,255,0.55)";
            ctx.beginPath();
            ctx.arc(90, 60, 22, 0, Math.PI * 2);
            ctx.arc(120, 55, 28, 0, Math.PI * 2);
            ctx.arc(150, 62, 20, 0, Math.PI * 2);
            ctx.fill();

            const firstIndex = Math.floor((ballWorldX - BALL_SCREEN_X) / TILE_W) - 1;
            const lastIndex = Math.floor((ballWorldX + (canvas.width - BALL_SCREEN_X)) / TILE_W) + 1;

            for (let i = Math.max(0, firstIndex); i <= Math.min(tiles.length - 1, lastIndex); i++) {
                const tile = tiles[i];
                const screenX = BALL_SCREEN_X + (i * TILE_W - ballWorldX);

                if (tile.type === "gap") continue;

                ctx.fillStyle = tile.type === "spike" ? "#5c4033" : "#8c5a2b";
                ctx.fillRect(screenX, GROUND_Y, TILE_W + 1, canvas.height - GROUND_Y);
                ctx.fillStyle = "#6fae4a";
                ctx.fillRect(screenX, GROUND_Y, TILE_W + 1, 6);

                if (tile.type === "spike") {
                    drawSpike(screenX, GROUND_Y);
                }

                if (tile.type === "flag") {
                    drawFlag(screenX);
                }

                if (tile.ring && !tile.collected) {
                    const cx = screenX + TILE_W / 2;
                    const cy = GROUND_Y - 70;
                    ctx.strokeStyle = "#ffd43b";
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.arc(cx, cy, RING_R, 0, Math.PI * 2);
                    ctx.stroke();
                }

                if (tile.wallHeight > 0) {
                    drawWall(screenX, tile.wallHeight);
                }
            }

            const ballScreenY = ballY;
            const shadowDistance = Math.max(0, GROUND_Y - ballScreenY - BALL_R);
            ctx.fillStyle = "rgba(37, 57, 32, " + Math.max(0.08, 0.3 - shadowDistance / 500) + ")";
            ctx.beginPath();
            ctx.ellipse(BALL_SCREEN_X, GROUND_Y - 2, BALL_R + shadowDistance * 0.05, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            const ballGradient = ctx.createRadialGradient(
                BALL_SCREEN_X - BALL_R * 0.35,
                ballScreenY - BALL_R * 0.4,
                2,
                BALL_SCREEN_X,
                ballScreenY,
                BALL_R * 1.2
            );
            ballGradient.addColorStop(0, "#ffb347");
            ballGradient.addColorStop(0.55, "#f76707");
            ballGradient.addColorStop(1, "#c2410c");
            ctx.fillStyle = ballGradient;
            ctx.beginPath();
            ctx.arc(BALL_SCREEN_X, ballScreenY, BALL_R, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#d9480f";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.strokeStyle = "rgba(0,0,0,0.35)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(BALL_SCREEN_X - BALL_R + 3, ballScreenY);
            ctx.lineTo(BALL_SCREEN_X + BALL_R - 3, ballScreenY);
            ctx.moveTo(BALL_SCREEN_X, ballScreenY - BALL_R + 3);
            ctx.lineTo(BALL_SCREEN_X, ballScreenY + BALL_R - 3);
            ctx.stroke();
        }

        function applyWallCollisions(prevX, candidateX) {
            const dir = candidateX >= prevX ? 1 : -1;
            const lo = Math.floor(Math.min(prevX, candidateX) / TILE_W) - 1;
            const hi = Math.floor(Math.max(prevX, candidateX) / TILE_W) + 1;

            for (let ti = Math.max(0, lo); ti <= Math.min(tiles.length - 1, hi); ti++) {
                const t = tiles[ti];
                if (!t.wallHeight) continue;
                const wallX = ti * TILE_W;
                const frontPrev = dir > 0 ? prevX + BALL_R : prevX - BALL_R;
                const frontNow = dir > 0 ? candidateX + BALL_R : candidateX - BALL_R;
                const crossed = dir > 0 ? (frontPrev < wallX && frontNow >= wallX) : (frontPrev > wallX && frontNow <= wallX);
                if (!crossed) continue;

                const ballTop = ballY - BALL_R;
                if (ballTop > GROUND_Y - t.wallHeight) {
                    vx = -vx * WALL_RESTITUTION;
                    return dir > 0 ? wallX - BALL_R : wallX + BALL_R;
                }
            }
            return candidateX;
        }

        function tick(timestamp) {
            if (gameOver) return;
            if (lastTime === null) lastTime = timestamp;
            const dt = Math.min(0.035, (timestamp - lastTime) / 1000);
            lastTime = timestamp;

            if (started && !levelComplete) {
                let desired = 0;
                if (leftHeld) desired -= MOVE_SPEED;
                if (rightHeld) desired += MOVE_SPEED;

                if (vx < desired) vx = Math.min(desired, vx + VX_ACCEL * dt);
                else if (vx > desired) vx = Math.max(desired, vx - VX_ACCEL * dt);
                if (!leftHeld && !rightHeld && Math.abs(vx) < VX_FRICTION * dt) vx = 0;

                const prevX = ballWorldX;
                let candidateX = ballWorldX + vx * dt;
                candidateX = applyWallCollisions(prevX, candidateX);
                if (candidateX < 0) {
                    candidateX = 0;
                    vx = Math.abs(vx) * WALL_RESTITUTION;
                }
                ballWorldX = candidateX;

                vy += GRAVITY * dt;
                ballY += vy * dt;

                const tileIndex = Math.floor(ballWorldX / TILE_W);
                const tile = tileAt(tileIndex);

                if (tile.ring && !tile.collected) {
                    const ringCenterWorldX = tileIndex * TILE_W + TILE_W / 2;
                    const ringCenterY = GROUND_Y - 70;
                    const dx = ballWorldX - ringCenterWorldX;
                    const dyy = ballY - ringCenterY;
                    if (Math.hypot(dx, dyy) < BALL_R + RING_R) {
                        tile.collected = true;
                        ringsCollected++;
                        ringsEl.textContent = String(ringsCollected);
                    }
                }

                if (ballY + BALL_R >= GROUND_Y && vy > 0) {
                    if (tile.type === "spike") {
                        endGame("hit a spike");
                        return;
                    } else if (tile.type === "gap") {
                        // fall through, no bounce
                    } else {
                        ballY = GROUND_Y - BALL_R;
                        vy = 0;
                        jumpsRemaining = MAX_JUMPS;
                    }
                }

                if (ballY - BALL_R > canvas.height) {
                    endGame("fell into a pit");
                    return;
                }

                const flagWorldX = (tiles.length - 1) * TILE_W + TILE_W / 2;
                if (ballWorldX >= flagWorldX) {
                    completeLevel();
                }

                if (vx > 0) progressScore += vx * dt * 0.2;
                score = Math.round(progressScore) + ringsCollected * 25 + levelBonus;
                scoreEl.textContent = String(score);
            }

            draw();
            rafId = requestAnimationFrame(tick);
        }

        const KEY_LEFT = { ArrowLeft: true, a: true, A: true };
        const KEY_RIGHT = { ArrowRight: true, d: true, D: true };
        const KEY_JUMP = { " ": true, ArrowUp: true, w: true, W: true };

        document.addEventListener("keydown", (event) => {
            if (KEY_LEFT[event.key]) {
                event.preventDefault();
                leftHeld = true;
                beginIfNeeded();
            } else if (KEY_RIGHT[event.key]) {
                event.preventDefault();
                rightHeld = true;
                beginIfNeeded();
            } else if (KEY_JUMP[event.key]) {
                event.preventDefault();
                if (!event.repeat) jump();
            }
        });

        document.addEventListener("keyup", (event) => {
            if (KEY_LEFT[event.key]) leftHeld = false;
            else if (KEY_RIGHT[event.key]) rightHeld = false;
        });

        canvas.addEventListener("pointerdown", (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = (event.clientX - rect.left) * (canvas.width / rect.width);
            if (x < canvas.width / 3) {
                leftHeld = true;
                beginIfNeeded();
            } else if (x > (canvas.width * 2) / 3) {
                rightHeld = true;
                beginIfNeeded();
            } else {
                jump();
            }
        });

        canvas.addEventListener("pointerup", () => {
            leftHeld = false;
            rightHeld = false;
        });
        canvas.addEventListener("pointerleave", () => {
            leftHeld = false;
            rightHeld = false;
        });

        reset();
        rafId = requestAnimationFrame(tick);
    }

    // -----------------------------------------------------------------
    // Breakout (classic brick breaker: paddle, ball, rows of bricks)
    // -----------------------------------------------------------------

    function initBreakout() {
        document.getElementById("breakout-wrap").hidden = false;

        const canvas = document.getElementById("breakout-canvas");
        const ctx = canvas.getContext("2d");
        const overlay = document.getElementById("breakout-overlay");
        const scoreEl = document.getElementById("breakout-score");
        const livesEl = document.getElementById("breakout-lives");
        const bricksEl = document.getElementById("breakout-bricks");

        const PADDLE_W = 100;
        const PADDLE_H = 14;
        const PADDLE_Y = canvas.height - 25;
        const BALL_R = 8;
        const BRICK_ROWS = 3;
        const BRICK_COLS = 10;
        const BRICK_W = 42;
        const BRICK_H = 18;
        const BRICK_PAD = 6;
        const BRICK_TOP = 35;
        const BRICK_LEFT = (canvas.width - (BRICK_COLS * (BRICK_W + BRICK_PAD) - BRICK_PAD)) / 2;

        const BRICK_COLORS = [
            ["#ff6b6b", "#ee5a24"],
            ["#feca57", "#ff9f43"],
            ["#48dbfb", "#0abde3"],
        ];

        let paddle, balls, bricks, score, lives, started, gameOver, startTime, lastTime, rafId;

        function reset() {
            paddle = {
                x: canvas.width / 2 - PADDLE_W / 2,
                y: PADDLE_Y,
                w: PADDLE_W,
                h: PADDLE_H,
            };
            balls = [];
            bricks = [];
            score = 0;
            lives = 3;
            started = false;
            gameOver = false;
            startTime = null;
            lastTime = null;
            leftPressed = false;
            rightPressed = false;
            scoreEl.textContent = "0";
            livesEl.textContent = "3";
            overlay.hidden = false;
            overlay.innerHTML = "<p>Click or press Space to launch</p>";
            initBricks();
            draw();
        }

        function initBricks() {
            bricks = [];
            const totalBricks = BRICK_ROWS * BRICK_COLS;
            for (let row = 0; row < BRICK_ROWS; row++) {
                for (let col = 0; col < BRICK_COLS; col++) {
                    bricks.push({
                        x: BRICK_LEFT + col * (BRICK_W + BRICK_PAD),
                        y: BRICK_TOP + row * (BRICK_H + BRICK_PAD),
                        w: BRICK_W,
                        h: BRICK_H,
                        color: BRICK_COLORS[row][0],
                        colorDark: BRICK_COLORS[row][1],
                        alive: true,
                    });
                }
            }
            bricksEl.innerHTML = "0<small class=\"stat-unit\">/" + totalBricks + "</small>";
        }

        function launchBall() {
            const ball = {
                x: paddle.x + paddle.w / 2,
                y: paddle.y - BALL_R - 1,
                dx: 0,
                dy: -420,
                r: BALL_R,
            };
            ball.dx = (Math.random() * 2 - 1) * 170;
            balls.push(ball);
            if (!startTime) {
                startTime = Date.now();
            }
            overlay.hidden = true;
        }

        function draw() {
            // Background
            ctx.fillStyle = "#1e1e2e";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Grid pattern
            ctx.strokeStyle = "rgba(255,255,255,0.03)";
            ctx.lineWidth = 1;
            for (let x = 0; x < canvas.width; x += 30) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += 30) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            // Bricks
            bricks.forEach((brick) => {
                if (!brick.alive) return;
                ctx.fillStyle = brick.colorDark;
                ctx.fillRect(brick.x + 2, brick.y + 2, brick.w, brick.h);
                ctx.fillStyle = brick.color;
                ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
                ctx.fillStyle = "rgba(255,255,255,0.15)";
                ctx.fillRect(brick.x, brick.y, brick.w, brick.h / 3);

                // Highlight
                ctx.fillStyle = "rgba(255,255,255,0.3)";
                ctx.fillRect(brick.x + 2, brick.y + 2, brick.w - 4, 3);
            });

            // Ball(s)
            balls.forEach((b) => {
                ctx.fillStyle = "#ffffff";
                ctx.shadowColor = "#48dbfb";
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Glow
                ctx.fillStyle = "rgba(72, 219, 251, 0.3)";
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r + 4, 0, Math.PI * 2);
                ctx.fill();
            });

            // Paddle
            const grad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.h);
            grad.addColorStop(0, "#48dbfb");
            grad.addColorStop(1, "#0abde3");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 7);
            ctx.fill();

            // Paddle highlight
            ctx.fillStyle = "rgba(255,255,255,0.4)";
            ctx.fillRect(paddle.x + 4, paddle.y + 2, paddle.w - 8, 3);

            // Particles for visual feedback
            if (started && !gameOver) {
                drawParticles();
            }
        }

        let particles = [];

        function spawnParticles(x, y, color, count) {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 50 + Math.random() * 150;
                particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1,
                    color: color,
                });
            }
        }

        function drawParticles() {
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx * 0.016;
                p.y += p.vy * 0.016;
                p.vy += 200 * 0.016;
                p.life -= 0.03;

                if (p.life <= 0) {
                    particles.splice(i, 1);
                    continue;
                }

                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
            }
            ctx.globalAlpha = 1;
        }

        function resetBall() {
            balls = [];
            paddle.x = canvas.width / 2 - paddle.w / 2;
            overlay.hidden = false;
            overlay.innerHTML = "<p>Click or press Space to launch</p>";
        }

        function endGame(reason) {
            if (gameOver) return;
            gameOver = true;
            cancelAnimationFrame(rafId);

            // Update overlay with final message
            overlay.innerHTML = "<p>" + (score > 0 ? "Game Over!" : "Game Over") + "</p>" +
                "<span class=\"overlay-sub\">" + reason + " · Score: " + score + "</span>";
            overlay.hidden = false;

            const durationSeconds = startTime ? (Date.now() - startTime) / 1000 : 0;

            // Small delay before submitting
            setTimeout(() => {
                finish(score, reason, durationSeconds);
            }, 1500);
        }

        // Mouse/touch control
        function updatePaddle(clientX) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const canvasX = (clientX - rect.left) * scaleX;
            paddle.x = Math.max(0, Math.min(canvas.width - paddle.w, canvasX - paddle.w / 2));
        }

        canvas.addEventListener("mousemove", (event) => {
            if (!started || gameOver) return;
            updatePaddle(event.clientX);
        });

        canvas.addEventListener("touchmove", (event) => {
            if (!started || gameOver) return;
            event.preventDefault();
            const touch = event.touches[0];
            updatePaddle(touch.clientX);
        }, { passive: false });

        // Launch ball on click/space
        function launchIfNeeded() {
            if (!started) {
                started = true;
                launchBall();
            } else if (balls.length === 0 && !gameOver) {
                launchBall();
            }
        }

        // Launch on any interaction
        function handleLaunchInteraction(event) {
            if (!started || (balls.length === 0 && !gameOver)) {
                launchIfNeeded();
            }
        }

        canvas.addEventListener("click", handleLaunchInteraction);
        canvas.addEventListener("pointerdown", handleLaunchInteraction);

        // Keyboard controls (launch + paddle)
        let rightPressed = false;
        let leftPressed = false;
        const PADDLE_SPEED = 400;

        document.addEventListener("keydown", (event) => {
            // Launch ball on Space/Enter
            if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                if (!started || (balls.length === 0 && !gameOver)) {
                    launchIfNeeded();
                }
            }
            // Paddle left
            else if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
                leftPressed = true;
                event.preventDefault();
            }
            // Paddle right
            else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
                rightPressed = true;
                event.preventDefault();
            }
        });

        document.addEventListener("keyup", (event) => {
            if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
                leftPressed = false;
            } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
                rightPressed = false;
            }
        });

        // Game loop - consolidated tick function (includes paddle control + ball physics)
        function tick(timestamp) {
            if (gameOver) {
                return;
            }

            if (!lastTime) lastTime = timestamp;
            const dtRaw = (timestamp - lastTime) / 1000;
            const dt = Math.min(0.05, Math.max(0.001, dtRaw));  // Ensure dt is at least 1ms
            lastTime = timestamp;

            if (!tick._frameCount) tick._frameCount = 0;
            tick._frameCount++;

            // Paddle keyboard control
            if (started && !gameOver && balls.length > 0) {
                if (leftPressed) {
                    paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
                }
                if (rightPressed) {
                    paddle.x = Math.min(canvas.width - paddle.w, paddle.x + PADDLE_SPEED * dt);
                }

                // Ball physics
                for (let bi = balls.length - 1; bi >= 0; bi--) {
                    const b = balls[bi];

                    // Move ball
                    b.x += b.dx * dt;
                    b.y += b.dy * dt;

                    // Wall collisions (left/right)
                    if (b.x - b.r < 0) {
                        b.x = b.r;
                        b.dx = Math.abs(b.dx);
                    } else if (b.x + b.r > canvas.width) {
                        b.x = canvas.width - b.r;
                        b.dx = -Math.abs(b.dx);
                    }

                    // Top wall collision
                    if (b.y - b.r < 0) {
                        b.y = b.r;
                        b.dy = Math.abs(b.dy);
                    }

                    // Bottom - lose ball
                    if (b.y - b.r > canvas.height) {
                        balls.splice(bi, 1);
                        if (balls.length === 0) {
                            lives--;
                            livesEl.textContent = String(lives);
                            if (lives <= 0) {
                                endGame("No balls left");
                                return;
                            }
                            resetBall();
                        }
                        continue;
                    }

                    // Paddle collision
                    if (
                        b.dy > 0 &&
                        b.y + b.r >= paddle.y &&
                        b.y + b.r <= paddle.y + paddle.h + 8 &&
                        b.x >= paddle.x - b.r &&
                        b.x <= paddle.x + paddle.w + b.r
                    ) {
                        // Calculate hit position (-1 to 1)
                        const hitPos = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
                        const speed = Math.sqrt(b.dx * b.dx + b.dy * b.dy);
                        const angle = hitPos * (Math.PI / 3); // -60 to 60 degrees

                        // Ensure ball goes upward after hitting paddle
                        b.dx = speed * Math.sin(angle);
                        b.dy = -Math.abs(speed * Math.cos(angle));
                        b.y = paddle.y - b.r;

                        spawnParticles(b.x, b.y, "#48dbfb", 8);
                    }

                    // Brick collision
                    for (let i = 0; i < bricks.length; i++) {
                        const brick = bricks[i];
                        if (!brick.alive) continue;

                        if (
                            b.x + b.r > brick.x &&
                            b.x - b.r < brick.x + brick.w &&
                            b.y + b.r > brick.y &&
                            b.y - b.r < brick.y + brick.h
                        ) {
                            brick.alive = false;
                            score += 100;
                            scoreEl.textContent = String(score);

                            const remaining = bricks.filter((br) => br.alive).length;
                            bricksEl.innerHTML = remaining + "<small class=\"stat-unit\">/" + (BRICK_ROWS * BRICK_COLS) + "</small>";

                            // Determine collision side
                            const overlapLeft = (b.x + b.r) - brick.x;
                            const overlapRight = (brick.x + brick.w) - (b.x - b.r);
                            const overlapTop = (b.y + b.r) - brick.y;
                            const overlapBottom = (brick.y + brick.h) - (b.y - b.r);

                            const minOverlapX = Math.min(overlapLeft, overlapRight);
                            const minOverlapY = Math.min(overlapTop, overlapBottom);

                            if (minOverlapX < minOverlapY) {
                                b.dx = -b.dx;
                            } else {
                                b.dy = -b.dy;
                            }

                            spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 12);

                            // Check win condition
                            if (bricks.every((br) => !br.alive)) {
                                endGame("All bricks broken!");
                                return;
                            }
                            break;
                        }
                    }
                }
            }

            draw();
            rafId = requestAnimationFrame(tick);
        };

        reset();
        rafId = requestAnimationFrame(tick);
    }

    function initPong() {
        document.getElementById("pong-wrap").hidden = false;

        const canvas = document.getElementById("pong-canvas");
        const ctx = canvas.getContext("2d");
        const overlay = document.getElementById("pong-overlay");
        const playerScoreEl = document.getElementById("pong-player-score");
        const aiScoreEl = document.getElementById("pong-ai-score");
        const PADDLE_WIDTH = 12;
        const PADDLE_HEIGHT = 78;
        const BALL_RADIUS = 8;
        const WINNING_SCORE = 5;
        const PLAYER_SPEED = 390;
        const AI_SPEED = 285;
        const pressed = new Set();

        let playerY, aiY, ball, playerScore, aiScore, started, gameOver, startTime, lastTime, rafId;

        function resetBall(direction) {
            ball = {
                x: canvas.width / 2,
                y: canvas.height / 2,
                dx: direction * 285,
                dy: (Math.random() * 2 - 1) * 115,
            };
        }

        function drawPaddle(x, y, colorTop, colorBottom) {
            const gradient = ctx.createLinearGradient(x, y, x + PADDLE_WIDTH, y + PADDLE_HEIGHT);
            gradient.addColorStop(0, colorTop);
            gradient.addColorStop(1, colorBottom);
            ctx.fillStyle = gradient;
            ctx.shadowColor = colorTop;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.roundRect(x, y, PADDLE_WIDTH, PADDLE_HEIGHT, 6);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        function draw() {
            const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
            background.addColorStop(0, "#102b35");
            background.addColorStop(0.5, "#0a1b23");
            background.addColorStop(1, "#10242b");
            ctx.fillStyle = background;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = "rgba(183, 224, 220, 0.2)";
            ctx.setLineDash([10, 12]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, 0);
            ctx.lineTo(canvas.width / 2, canvas.height);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.strokeStyle = "rgba(183, 224, 220, 0.12)";
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 54, 0, Math.PI * 2);
            ctx.stroke();

            drawPaddle(28, playerY, "#8ce4c4", "#32ad9c");
            drawPaddle(canvas.width - 28 - PADDLE_WIDTH, aiY, "#ffc785", "#ee8a61");

            ctx.fillStyle = "#f3fff8";
            ctx.shadowColor = "#b8fff0";
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        function reset() {
            playerY = canvas.height / 2 - PADDLE_HEIGHT / 2;
            aiY = playerY;
            playerScore = 0;
            aiScore = 0;
            started = false;
            gameOver = false;
            startTime = null;
            lastTime = null;
            playerScoreEl.textContent = "0";
            aiScoreEl.textContent = "0";
            pressed.clear();
            resetBall(-1);
            overlay.hidden = false;
            overlay.innerHTML = "<p>Press W/S or ↑/↓ to serve</p><span class=\"overlay-sub\">First to five points wins</span>";
            draw();
        }

        function finishMatch() {
            gameOver = true;
            cancelAnimationFrame(rafId);
            const won = playerScore > aiScore;
            const detail = (won ? "Won " : "Lost ") + playerScore + "-" + aiScore;
            overlay.innerHTML = "<p>" + (won ? "You win!" : "Computer wins") + "</p>" +
                "<span class=\"overlay-sub\">" + detail + " · Press Restart to play again</span>";
            overlay.hidden = false;
            const durationSeconds = startTime ? (Date.now() - startTime) / 1000 : 0;
            setTimeout(() => {
                finish(playerScore * 100 + Math.max(0, 50 - aiScore * 10), detail, durationSeconds);
            }, 1400);
        }

        function tick(timestamp) {
            if (gameOver) return;
            if (!lastTime) lastTime = timestamp;
            const dt = Math.min(0.04, Math.max(0.001, (timestamp - lastTime) / 1000));
            lastTime = timestamp;

            if (started) {
                if (pressed.has("up")) playerY -= PLAYER_SPEED * dt;
                if (pressed.has("down")) playerY += PLAYER_SPEED * dt;
                playerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, playerY));

                const aiTarget = ball.dx > 0 ? ball.y - PADDLE_HEIGHT / 2 : canvas.height / 2 - PADDLE_HEIGHT / 2;
                const aiDifference = aiTarget - aiY;
                aiY += Math.sign(aiDifference) * Math.min(Math.abs(aiDifference), AI_SPEED * dt);
                aiY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, aiY));

                ball.x += ball.dx * dt;
                ball.y += ball.dy * dt;

                if (ball.y - BALL_RADIUS <= 0 || ball.y + BALL_RADIUS >= canvas.height) {
                    ball.y = Math.max(BALL_RADIUS, Math.min(canvas.height - BALL_RADIUS, ball.y));
                    ball.dy *= -1;
                }

                if (ball.dx < 0 && ball.x - BALL_RADIUS <= 40 && ball.y >= playerY && ball.y <= playerY + PADDLE_HEIGHT) {
                    const impact = (ball.y - (playerY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
                    const speed = Math.min(470, Math.hypot(ball.dx, ball.dy) + 12);
                    const angle = impact * 0.9;
                    ball.dx = Math.abs(speed * Math.cos(angle));
                    ball.dy = speed * Math.sin(angle);
                    ball.x = 40 + BALL_RADIUS;
                } else if (
                    ball.dx > 0 && ball.x + BALL_RADIUS >= canvas.width - 40 &&
                    ball.y >= aiY && ball.y <= aiY + PADDLE_HEIGHT
                ) {
                    const impact = (ball.y - (aiY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
                    const speed = Math.min(470, Math.hypot(ball.dx, ball.dy) + 8);
                    const angle = impact * 0.75;
                    ball.dx = -Math.abs(speed * Math.cos(angle));
                    ball.dy = speed * Math.sin(angle);
                    ball.x = canvas.width - 40 - BALL_RADIUS;
                }

                if (ball.x + BALL_RADIUS < 0) {
                    aiScore++;
                    aiScoreEl.textContent = String(aiScore);
                    if (aiScore >= WINNING_SCORE) finishMatch();
                    else resetBall(-1);
                } else if (ball.x - BALL_RADIUS > canvas.width) {
                    playerScore++;
                    playerScoreEl.textContent = String(playerScore);
                    if (playerScore >= WINNING_SCORE) finishMatch();
                    else resetBall(1);
                }
            }

            if (!gameOver) {
                draw();
                rafId = requestAnimationFrame(tick);
            }
        }

        function controlForKey(key) {
            if (key === "ArrowUp" || key === "w" || key === "W") return "up";
            if (key === "ArrowDown" || key === "s" || key === "S") return "down";
            return null;
        }

        document.addEventListener("keydown", (event) => {
            const control = controlForKey(event.key);
            if (!control || gameOver) return;
            event.preventDefault();
            pressed.add(control);
            if (!started) {
                started = true;
                startTime = Date.now();
                overlay.hidden = true;
            }
        });

        document.addEventListener("keyup", (event) => {
            const control = controlForKey(event.key);
            if (control) pressed.delete(control);
        });

        canvas.addEventListener("pointermove", (event) => {
            if (!started || gameOver) return;
            const rect = canvas.getBoundingClientRect();
            const scaleY = canvas.height / rect.height;
            playerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT,
                (event.clientY - rect.top) * scaleY - PADDLE_HEIGHT / 2));
        });

        canvas.addEventListener("pointerdown", () => {
            if (started || gameOver) return;
            started = true;
            startTime = Date.now();
            overlay.hidden = true;
        });

        reset();
        rafId = requestAnimationFrame(tick);
    }

    if (game === "snake") {
        initSnake();
    } else if (game === "memory_match") {
        initMemoryMatch();
    } else if (game === "blackjack") {
        initBlackjack();
    } else if (game === "solitaire") {
        initSolitaire();
    } else if (game === "minesweeper") {
        initMinesweeper();
    } else if (game === "reaction_time") {
        initReactionTime();
    } else if (game === "archery") {
        initArchery();
    } else if (game === "geometry_dash") {
        initGeometryDash();
    } else if (game === "dinosaur") {
        initDinosaur();
    } else if (game === "tetris") {
        initTetris();
    } else if (game === "chess") {
        initChess();
    } else if (game === "car_racing") {
        initCarRacing();
    } else if (game === "bounce") {
        initBounce();
    } else if (game === "breakout") {
        initBreakout();
    } else if (game === "pong") {
        initPong();
    }
})();
