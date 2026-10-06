// Layout verification: open pages, check horizontal overflow + console errors,
// and dump computed design-token values (colors, fonts) to confirm the dark
// red CodeQuest theme is actually applied.
const { spawn } = require("child_process");
const http = require("http");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333;
const BASE = "http://127.0.0.1:8000";

const PAGES = [
  { name: "home-1440", url: "/", width: 1440, height: 1000 },
  { name: "home-390", url: "/", width: 390, height: 844 },
  { name: "challenges-1440", url: "/challenges/", width: 1440, height: 1000 },
  { name: "challenges-390", url: "/challenges/", width: 390, height: 844 },
  { name: "courses-1440", url: "/courses/", width: 1440, height: 1000 },
  { name: "courses-390", url: "/courses/", width: 390, height: 844 },
  { name: "quizzes-1440", url: "/quizzes/", width: 1440, height: 1000 },
  { name: "competitions-1440", url: "/competitions/", width: 1440, height: 1000 },
  { name: "games-1440", url: "/games/", width: 1440, height: 1000 },
  { name: "games-390", url: "/games/", width: 390, height: 844 },
  { name: "leaderboard-1440", url: "/leaderboard/", width: 1440, height: 1000 },
  { name: "chat-1440", url: "/community/chat/", width: 1440, height: 1000 },
  { name: "chat-390", url: "/community/chat/", width: 390, height: 844 },
  { name: "login-1440", url: "/accounts/login/", width: 1440, height: 1000 },
  { name: "login-390", url: "/accounts/login/", width: 390, height: 844 },
  { name: "typing-1440", url: "/typing/", width: 1440, height: 1000 },
  { name: "typing-390", url: "/typing/", width: 390, height: 844 },
  { name: "arcade-1440", url: "/arcade/", width: 1440, height: 1000 },
  { name: "gba-1440", url: "/arcade/gba/", width: 1440, height: 1000 },
];

function startChrome() {
  const proc = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--remote-debugging-port=" + PORT,
    "--window-size=1440,1000",
    "--user-data-dir=" + process.env.TEMP + "\\cq-chrome-profile",
    "about:blank",
  ], { stdio: "ignore" });
  return proc;
}

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: "127.0.0.1", port: PORT, path }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function connectWs(url) {
  return new Promise((resolve, reject) => {
    const key = Buffer.from(Array.from({ length: 16 }, () => Math.floor(Math.random() * 256))).toString("base64");
    const req = http.request({
      host: "127.0.0.1",
      port: PORT,
      path: url,
      headers: {
        Connection: "Upgrade",
        Upgrade: "websocket",
        "Sec-WebSocket-Key": key,
        "Sec-WebSocket-Version": "13",
      },
    });
    req.end();
    req.on("upgrade", (res, socket) => resolve(socket));
    req.on("error", reject);
  });
}

// Minimal WebSocket client (send text frames, receive text frames)
class WS {
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.waiters = [];
    socket.on("data", (d) => {
      this.buffer = Buffer.concat([this.buffer, d]);
      this._drain();
    });
    socket.on("error", () => {});
  }
  _drain() {
    while (true) {
      if (this.buffer.length < 2) return;
      const len0 = this.buffer[1] & 0x7f;
      let offset = 2;
      let len = len0;
      if (len0 === 126) {
        if (this.buffer.length < 4) return;
        len = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (len0 === 127) {
        if (this.buffer.length < 10) return;
        len = Number(this.buffer.readBigUInt64BE(2));
        offset = 10;
      }
      if (this.buffer.length < offset + len) return;
      const payload = this.buffer.subarray(offset, offset + len);
      this.buffer = this.buffer.subarray(offset + len);
      const w = this.waiters.shift();
      if (w) w(payload.toString("utf8"));
      else this.queue = payload.toString("utf8");
    }
  }
  send(obj) {
    const data = Buffer.from(JSON.stringify(obj), "utf8");
    const mask = Buffer.from([0x11, 0x22, 0x33, 0x44]);
    let header;
    if (data.length < 126) header = Buffer.from([0x81, 0x80 | data.length]);
    else if (data.length < 65536) header = Buffer.from([0x81, 0x80 | 126, data.length >> 8, data.length & 0xff]);
    else header = Buffer.from([0x81, 0x80 | 127, 0, 0, 0, 0, data.length >> 24, (data.length >> 16) & 0xff, (data.length >> 8) & 0xff, data.length & 0xff]);
    const masked = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) masked[i] = data[i] ^ mask[i % 4];
    this.socket.write(Buffer.concat([header, mask, masked]));
  }
  next() {
    if (this.queue) { const q = this.queue; this.queue = undefined; return Promise.resolve(q); }
    return new Promise((resolve) => this.waiters.push(resolve));
  }
}

async function main() {
  const chromeProc = startChrome();
  await delay(2500);
  const targets = await getJson("/json/list");
  const page = targets.find((t) => t.type === "page");
  const ws = new WS(await connectWs(page.webSocketDebuggerUrl));
  let msgId = 0;
  const send = (method, params = {}) => new Promise(async (resolve) => {
    const id = ++msgId;
    ws.send({ id, method, params });
    while (true) {
      const raw = await ws.next();
      const msg = JSON.parse(raw);
      if (msg.id === id) { resolve(msg.result || msg); break; }
    }
  });

  await send("Runtime.enable");
  await send("Page.enable");

  const results = [];
  for (const p of PAGES) {
    await send("Emulation.setDeviceMetricsOverride", { width: p.width, height: p.height, deviceScaleFactor: 1, mobile: p.width < 500 });
    await send("Page.navigate", { url: BASE + p.url });
    await delay(1800);
    const evalRes = await send("Runtime.evaluate", { expression: `(function(){
      const de = document.documentElement;
      const overflowX = Math.max(de.scrollWidth, document.body.scrollWidth) - de.clientWidth;
      const errors = window.__errs || [];
      const cs = getComputedStyle(document.body);
      const nav = document.querySelector('.navbar');
      const navBg = nav ? getComputedStyle(nav).backgroundColor : null;
      const brandAccent = document.querySelector('.brand-accent');
      const brandColor = brandAccent ? getComputedStyle(brandAccent).color : null;
      const btn = document.querySelector('.btn');
      const btnBg = btn ? getComputedStyle(btn).backgroundColor : null;
      const card = document.querySelector('.challenge-card, .games-home-card, .panel, .auth-card');
      const cardBg = card ? getComputedStyle(card).backgroundColor : null;
      const bodyFont = cs.fontFamily.split(',')[0];
      const navLinks = document.querySelectorAll('.nav-link').length;
      return JSON.stringify({ overflowX, navBg, brandColor, btnBg, cardBg, bodyFont, navLinks, title: document.title });
    })()`, returnByValue: true });
    const data = JSON.parse(evalRes.result.value);
    data.name = p.name;
    results.push(data);
  }

  console.log(JSON.stringify(results, null, 1));
  chromeProc.kill();
  process.exit(0);
}

main().catch((e) => { console.error("ERR", e); process.exit(1); });
