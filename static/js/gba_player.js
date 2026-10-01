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
    let romObjectUrl = null;

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

        window.EJS_player = "gba-player-screen";
        window.EJS_core = "gba";
        window.EJS_gameUrl = gameUrl;
        window.EJS_gameName = selectedFile ? selectedFile.name : "GBA Homebrew";
        window.EJS_pathtodata = emulatorDataPath;
        window.EJS_startOnLoaded = true;
        window.EJS_ready = function () {
            status.textContent = "Game ready. Use the keyboard controls below.";
        };

        const loader = document.createElement("script");
        loader.src = emulatorDataPath + "loader.js";
        loader.async = true;
        loader.onload = function () {
            status.textContent = "Emulator loaded. Starting game...";
        };
        loader.onerror = function () {
            status.textContent = "EmulatorJS could not load. Check your connection and try again.";
            startButton.disabled = false;
            placeholder.hidden = false;
        };
        document.head.appendChild(loader);
    });
})();