/* auth.js — offline captcha + local account system */
 
/* ---------- Captcha (free, works offline, drawn on a <canvas>) ---------- */
const Captcha = (() => {
  let code = "";
  const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
 
  function draw(canvas) {
    code = Array.from({ length: 5 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
    const c = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
    c.fillStyle = "#eef2ff"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) {                       // noise lines
      c.strokeStyle = `hsl(${Math.random() * 360},60%,55%)`;
      c.beginPath(); c.moveTo(Math.random() * w, Math.random() * h);
      c.lineTo(Math.random() * w, Math.random() * h); c.stroke();
    }
    c.font = "bold 28px monospace"; c.textBaseline = "middle";
    [...code].forEach((ch, i) => {                      // wobbly letters
      c.save(); c.translate(16 + i * 28, h / 2 + (Math.random() * 8 - 4));
      c.rotate((Math.random() - 0.5) * 0.6); c.fillStyle = "#1b2559"; c.fillText(ch, 0, 0); c.restore();
    });
  }
  const check = value => value.trim().toUpperCase() === code;
  return { draw, check };
})();
 
/* ---------- Accounts ---------- */
const Auth = (() => {
  const SESSION = "et_session";
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
 
  // Fallback hash for plain-http pages where crypto.subtle is unavailable
  function simpleHash(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }
 
  async function hash(password, salt) {
    const text = salt + password;
    if (window.crypto && crypto.subtle) {
      return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
    }
    return "f" + simpleHash(text);
  }
 
  async function register({ username, password, repeat, dob, captcha }) {
    const name = username.trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) return { ok: false, error: "Username must be 3–20 letters, numbers or underscores." };
    if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
    if (password !== repeat) return { ok: false, error: "Passwords do not match." };
    if (!dob || dob > new Date().toISOString().slice(0, 10) || dob < "1900-01-01") return { ok: false, error: "Please enter a valid date of birth." };
    if (!Captcha.check(captcha)) return { ok: false, error: "Captcha is incorrect. Please try again." };
 
    const key = name.toLowerCase();                      // usernames are case-insensitive and unique
    if (await DB.get("users", key)) return { ok: false, error: "That username is already taken." };
 
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, "0")).join("");
    const user = { username: key, display: name, salt, hash: await hash(password, salt), dob, created: Date.now() };
    await DB.put("users", user);
    localStorage.setItem(SESSION, key);
    return { ok: true, user };
  }
 
  async function login(username, password) {
    const user = await DB.get("users", username.trim().toLowerCase());
    if (!user || user.hash !== await hash(password, user.salt)) return { ok: false, error: "Wrong username or password." };
    localStorage.setItem(SESSION, user.username);
    return { ok: true, user };
  }
 
  const logout = () => localStorage.removeItem(SESSION);
  const current = () => localStorage.getItem(SESSION);
  return { register, login, logout, current };
})();