import { firebaseConfig } from "./firebase-config.js";

const GOAL = 15000;
const RING_LEN = 2 * Math.PI * 96; // must match r=96 in index.html

/* ------------------------------------------------------------------ */
/*  Data layer: Firebase (shared) or localStorage (demo fallback)      */
/* ------------------------------------------------------------------ */
const hasFirebase = firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("PASTE");

async function createStore() {
  if (hasFirebase) {
    try {
      const V = "10.12.2";
      const [{ initializeApp }, fs] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`)
      ]);
      const db = fs.getFirestore(initializeApp(firebaseConfig));
      const col = fs.collection(db, "donations");
      return {
        mode: "firebase",
        subscribe(cb) {
          const q = fs.query(col, fs.orderBy("createdAt", "desc"));
          fs.onSnapshot(q, (snap) => {
            cb(snap.docs.map((d) => {
              const x = d.data({ serverTimestamps: "estimate" });
              return { id: d.id, name: x.name, amount: x.amount, ts: x.createdAt ? x.createdAt.toMillis() : Date.now() };
            }));
          }, (err) => { console.error(err); toast("مشكل في الاتصال، عاود حاول 😕", true); });
        },
        add(name, amount) {
          return fs.addDoc(col, { name, amount, createdAt: fs.serverTimestamp() });
        }
      };
    } catch (e) { console.error("Firebase failed, using demo mode", e); }
  }
  // ---- demo mode ----
  const KEY = "cistac_donations_v1";
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  return {
    mode: "local",
    subscribe(cb) {
      const push = () => cb(read().sort((a, b) => b.ts - a.ts));
      push();
      window.addEventListener("storage", push);
      this._push = push;
    },
    add(name, amount) {
      const all = read();
      all.push({ id: String(Date.now()), name, amount, ts: Date.now() });
      localStorage.setItem(KEY, JSON.stringify(all));
      this._push();
      return Promise.resolve();
    }
  };
}

/* ------------------------------------------------------------------ */
/*  DOM                                                                */
/* ------------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const el = {
  countNow: $("countNow"), countGoal: $("countGoal"), pct: $("pct"), ring: $("ringFill"),
  remaining: $("remaining"), list: $("list"), empty: $("empty"), donorCount: $("donorCount"),
  modal: $("modal"), form: $("form"), name: $("name"), amount: $("amount"),
  error: $("error"), submit: $("submitBtn"), toast: $("toast")
};
el.countGoal.textContent = GOAL.toLocaleString("en-US");
el.ring.style.strokeDasharray = RING_LEN;
el.ring.style.strokeDashoffset = RING_LEN;

// logos: show a text badge if the image file is missing
document.querySelectorAll(".logo img").forEach((img) => {
  const miss = () => img.parentElement.classList.add("missing");
  img.addEventListener("error", miss);
  if (img.complete && img.naturalWidth === 0) miss();
});

/* ------------------------------------------------------------------ */
/*  Rendering                                                          */
/* ------------------------------------------------------------------ */
let shown = 0;
let animId = 0;
let goalCelebrated = false;
let firstRender = true;

function animateCount(to) {
  cancelAnimationFrame(animId);
  const from = shown, start = performance.now(), dur = 1100;
  const step = (t) => {
    const k = Math.min(1, (t - start) / dur);
    const ease = 1 - Math.pow(1 - k, 3);
    shown = Math.round(from + (to - from) * ease);
    el.countNow.textContent = shown.toLocaleString("en-US");
    if (k < 1) animId = requestAnimationFrame(step);
  };
  animId = requestAnimationFrame(step);
}

const COLORS = ["#2563eb", "#7c3aed", "#0ea5e9", "#db2777", "#059669", "#d97706", "#4f46e5"];
const colorFor = (s) => COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

function ago(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "توّا";
  const m = Math.floor(s / 60);
  if (m < 60) return m === 1 ? "من دقيقة" : m === 2 ? "من دقيقتين" : `من ${m} دقائق`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? "من ساعة" : h === 2 ? "من ساعتين" : `من ${h} ساعات`;
  const d = Math.floor(h / 24);
  return d === 1 ? "من نهار" : d === 2 ? "من نهارين" : `من ${d} أيام`;
}

let lastList = [];
function render(list) {
  lastList = list;
  const total = list.reduce((s, d) => s + d.amount, 0);
  const pct = Math.min(100, (total / GOAL) * 100);

  animateCount(total);
  el.ring.style.strokeDashoffset = RING_LEN * (1 - pct / 100);
  el.pct.textContent = (pct < 10 && pct > 0 ? pct.toFixed(1) : Math.floor(pct)) + "%";
  el.remaining.textContent = total >= GOAL
    ? "مبروك! وصلنا للهدف 🎉 يعطيكم الصحة"
    : `باقي ${(GOAL - total).toLocaleString("en-US")} دينار باش نوصلو للهدف`;

  el.donorCount.textContent = list.length;
  el.empty.classList.toggle("hide", list.length > 0);
  el.list.innerHTML = "";
  list.forEach((d) => {
    const li = document.createElement("li");
    li.className = "item";
    const av = document.createElement("div");
    av.className = "avatar";
    av.style.background = colorFor(d.name);
    av.textContent = (Array.from(d.name.trim())[0] || "?").toUpperCase();
    const who = document.createElement("div");
    who.className = "who";
    const n = document.createElement("div"); n.className = "n"; n.textContent = d.name;
    const t = document.createElement("div"); t.className = "t"; t.textContent = ago(d.ts);
    who.append(n, t);
    const a = document.createElement("div");
    a.className = "amt"; a.textContent = `${d.amount.toLocaleString("en-US")} د`;
    li.append(av, who, a);
    el.list.appendChild(li);
  });

  if (total >= GOAL && !goalCelebrated && !firstRender) { goalCelebrated = true; confetti(260); }
  if (total >= GOAL) goalCelebrated = true;
  firstRender = false;
}
setInterval(() => lastList.length && render(lastList), 60000); // refresh "ago" labels

/* ------------------------------------------------------------------ */
/*  Modal + form                                                       */
/* ------------------------------------------------------------------ */
function openModal() {
  el.modal.classList.add("open");
  el.modal.setAttribute("aria-hidden", "false");
  setTimeout(() => el.name.focus(), 300);
}
function closeModal() {
  el.modal.classList.remove("open");
  el.modal.setAttribute("aria-hidden", "true");
  el.error.textContent = "";
}
$("donateBtn").addEventListener("click", openModal);
$("closeBtn").addEventListener("click", closeModal);
el.modal.addEventListener("click", (e) => { if (e.target === el.modal) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
$("chips").addEventListener("click", (e) => {
  if (e.target.dataset.v) el.amount.value = e.target.dataset.v;
});

let store;
el.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = el.name.value.trim().replace(/\s+/g, " ");
  const amount = Number(el.amount.value);

  if (name.length < 2) return (el.error.textContent = "اكتب اسمك (حرفين على الأقل) 🙂");
  if (!Number.isInteger(amount) || amount < 1) return (el.error.textContent = "اكتب مبلغ صحيح (دينار على الأقل)");
  if (amount > GOAL) return (el.error.textContent = `المبلغ أكبر من الهدف (${GOAL} دينار)`);
  if (!store) return (el.error.textContent = "استنى شوية، التطبيق يحمّل...");

  el.error.textContent = "";
  el.submit.disabled = true;
  el.submit.textContent = "نبعثو...";
  try {
    await store.add(name, amount);
    el.form.reset();
    closeModal();
    toast(`يعطيك الصحة ${name}! تبرعك بـ ${amount} د تسجل 💙`);
    confetti(120);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    console.error(err);
    el.error.textContent = "صار مشكل، عاود حاول من فضلك";
  } finally {
    el.submit.disabled = false;
    el.submit.textContent = "ابعث التبرع";
  }
});

/* ------------------------------------------------------------------ */
/*  Toast + confetti                                                   */
/* ------------------------------------------------------------------ */
let toastTimer;
function toast(msg, bad) {
  el.toast.textContent = msg;
  el.toast.style.background = bad ? "#e11d48" : "#10b981";
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), 3600);
}

const cv = $("confetti"), ctx = cv.getContext("2d");
let parts = [], raf = 0;
function sizeCv() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
addEventListener("resize", sizeCv); sizeCv();
function confetti(n) {
  const cols = ["#38bdf8", "#6366f1", "#c084fc", "#f472b6", "#fbbf24", "#34d399"];
  for (let i = 0; i < n; i++) {
    parts.push({
      x: innerWidth / 2, y: innerHeight * 0.55,
      vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 15 - 4,
      s: Math.random() * 7 + 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      c: cols[(Math.random() * cols.length) | 0], life: 1
    });
  }
  if (!raf) loop();
}
function loop() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.scale(devicePixelRatio, devicePixelRatio);
  parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 40);
  parts.forEach((p) => {
    p.vy += 0.38; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.r += p.vr; p.life -= 0.004;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
    ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c;
    ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
    ctx.restore();
  });
  raf = parts.length ? requestAnimationFrame(loop) : 0;
  if (!raf) ctx.clearRect(0, 0, cv.width, cv.height);
}

/* ------------------------------------------------------------------ */
/*  Boot                                                               */
/* ------------------------------------------------------------------ */
createStore().then((s) => {
  store = s;
  s.subscribe(render);
  if (s.mode === "local") console.info("DEMO mode: add your Firebase keys in firebase-config.js");
});