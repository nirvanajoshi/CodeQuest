(function () {
    const form = document.getElementById("gba-load-form");
    const fileInput = document.getElementById("gba-rom-file");
    const fileLabel = document.getElementById("gba-file-label");
    const urlInput = document.getElementById("gba-rom-url");
    const startButton = document.getElementById("gba-start-button");
    const status = document.getElementById("gba-status");
    const placeholder = document.getElementById("gba-placeholder");
    const player = document.getElementById("gba-player-screen");
    const emulatorDataPath = "https://cdn.emulatorjs.org/stable/data/";
    const wasdButtons = { KeyW: 4, KeyA: 6, KeyS: 5, KeyD: 7 };
    const pressedWasdKeys = new Set();
    let romObjectUrl = null;

    function handleWasdInput(event, isPressed) {
        const buttonIndex = wasdButtons[event.code];
        const target = event.target;
        const emulator = window.EJS_emulator;
        if (buttonIndex === undefined || !emulator?.started || !emulator.gameManager?.simulateInput) {
            return;
        }
        if (target instanceof HTMLElement && (target.isContentEditable || target.matches("input, textarea, select"))) {
            return;
        }

        event.preventDefault();
        const wasPressed = pressedWasdKeys.has(event.code);
        if (wasPressed === isPressed) {
            return;
        }
        if (isPressed) {
            pressedWasdKeys.add(event.code);
        } else {
            pressedWasdKeys.delete(event.code);
        }
        emulator.gameManager.simulateInput(0, buttonIndex, isPressed ? 1 : 0);
    }

    window.addEventListener("keydown", function (event) {
        handleWasdInput(event, true);
    });
    window.addEventListener("keyup", function (event) {
        handleWasdInput(event, false);
    });
    window.addEventListener("blur", function () {
        const emulator = window.EJS_emulator;
        pressedWasdKeys.forEach(function (code) {
            if (emulator?.started && emulator.gameManager?.simulateInput) {
                emulator.gameManager.simulateInput(0, wasdButtons[code], 0);
            }
        });
        pressedWasdKeys.clear();
    });

    fileInput.addEventListener("change", function () {
        const file = fileInput.files[0];
        if (file) {
            fileLabel.textContent = file.name;
            urlInput.value = "";
        }
    });

    urlInput.addEventListener("input", function () {
        if (urlInput.value) {
            fileInput.value = "";
            fileLabel.textContent = "Choose a .gba or .zip file";
        }
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const selectedFile = fileInput.files[0];
        const suppliedUrl = urlInput.value.trim();
        let gameUrl;

        if (selectedFile) {
            if (!/\.(gba|zip)$/i.test(selectedFile.name)) {
                status.textContent = "Choose a .gba or .zip game file.";
                return;
            }
            if (romObjectUrl) {
                URL.revokeObjectURL(romObjectUrl);
            }
            romObjectUrl = URL.createObjectURL(selectedFile);
            gameUrl = romObjectUrl;
        } else if (suppliedUrl) {
            try {
                const parsedUrl = new URL(suppliedUrl);
                if (parsedUrl.protocol !== "https:") {
                    throw new Error("Use a secure HTTPS ROM URL.");
                }
                gameUrl = parsedUrl.href;
            } catch (error) {
                status.textContent = error.message || "Enter a valid HTTPS ROM URL.";
                return;
            }
        } else {
            status.textContent = "Choose a ROM file or enter an HTTPS ROM URL.";
            return;
        }

        startButton.disabled = true;
        status.textContent = "Loading EmulatorJS and game...";
        placeholder.hidden = true;
        player.replaceChildren();

        window.EJS_player = "#gba-player-screen";
        window.EJS_core = "gba";
        window.EJS_gameUrl = gameUrl;
        window.EJS_gameName = selectedFile ? selectedFile.name : "GBA Homebrew";
        window.EJS_pathtodata = emulatorDataPath;
        window.EJS_startOnLoaded = true;
        window.EJS_defaultControls = {
            0: {
                0: { value: "x", value2: "BUTTON_2" },
                2: { value: "v", value2: "SELECT" },
                3: { value: "enter", value2: "START" },
                4: { value: "up arrow", value2: "DPAD_UP" },
                5: { value: "down arrow", value2: "DPAD_DOWN" },
                6: { value: "left arrow", value2: "DPAD_LEFT" },
                7: { value: "right arrow", value2: "DPAD_RIGHT" },
                8: { value: "z", value2: "BUTTON_1" }
            },
            1: {},
            2: {},
            3: {}
        };
        window.EJS_ready = function () {
            status.textContent = "Emulator ready. Loading game...";
        };
        window.EJS_onGameStart = function () {
            status.textContent = "Game ready. Use the arrows or WASD to move.";
        };

        const loader = document.createElement("script");
        loader.src = emulatorDataPath + "loader.js";
        loader.async = true;
        loader.onload = function () {
            status.textContent = "Emulator loaded. Preparing game...";
        };
        loader.onerror = function () {
            status.textContent = "EmulatorJS could not load. Check your connection and try again.";
            startButton.disabled = false;
            placeholder.hidden = false;
        };
        document.head.appendChild(loader);
    });
})();