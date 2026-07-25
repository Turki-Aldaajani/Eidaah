// تأثيرات «إحياء» خفيفة للموقع — بلا مكتبات خارجية وبلا ملفات صوت.
// - burstConfetti: رشقة قصاصات ملوّنة صغيرة (احتفال بدون مبالغة).
// - playCorrect / playWrong: نغمات لطيفة مولّدة بالـWeb Audio API (لا تحتاج ملفات mp3).
// تُحترم تفضيلات «تقليل الحركة» و«كتم الصوت» (localStorage: an_sound = "off").

const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const soundEnabled = () => {
  try {
    return localStorage.getItem("an_sound") !== "off";
  } catch {
    return true;
  }
};

// ------------------------------------------------------------------
// قصاصات الاحتفال — تُلحق مؤقتاً بالجسم ثم تُزال تلقائياً
// ------------------------------------------------------------------
export function burstConfetti(x, y) {
  if (typeof document === "undefined" || reduceMotion()) return;
  const colors = ["#2f8f6b", "#e3b23c", "#4aa3df", "#7bd389", "#f06d6d"];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("span");
    p.className = "confetti-bit";
    const angle = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.6;
    const dist = 55 + Math.random() * 55;
    p.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    p.style.setProperty("--dy", `${Math.sin(angle) * dist - 20}px`);
    p.style.background = colors[i % colors.length];
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 950);
  }
}

// ------------------------------------------------------------------
// نغمات لطيفة — مولّدة برمجياً (بلا أصول صوتية)
// ------------------------------------------------------------------
let _actx = null;
function audioCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!_actx) _actx = new AC();
  if (_actx.state === "suspended") _actx.resume().catch(() => {});
  return _actx;
}

function tone(ac, freq, delay, dur, type = "sine", peak = 0.11) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = ac.currentTime + delay;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(ac.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}

// نغمة صاعدة لطيفة للإجابة الصحيحة
export function playCorrect() {
  if (!soundEnabled()) return;
  const ac = audioCtx();
  if (!ac) return;
  tone(ac, 659.25, 0, 0.16); // E5
  tone(ac, 987.77, 0.11, 0.18); // B5
}

// نغمة خافتة قصيرة للإجابة الخاطئة (بلا إزعاج)
export function playWrong() {
  if (!soundEnabled()) return;
  const ac = audioCtx();
  if (!ac) return;
  tone(ac, 196, 0, 0.2, "sine", 0.08); // G3 خافت
}
