const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, "data");
const REG_FILE = path.join(DATA_DIR, "registrations.json");
const ADMIN_FILE = path.join(DATA_DIR, "admin.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(REG_FILE)) fs.writeFileSync(REG_FILE, "[]", "utf8");

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return fallback; }
}
function writeJson(file, data) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
}
function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}
function getRegistrations() { return readJson(REG_FILE, []); }
function saveRegistrations(data) { writeJson(REG_FILE, data); }

async function initializeAdmin() {
  if (!fs.existsSync(ADMIN_FILE)) {
    const email = clean(process.env.ADMIN_EMAIL || "admin@futurepath.local", 200).toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
    const passwordHash = await bcrypt.hash(password, 12);
    writeJson(ADMIN_FILE, { email, passwordHash });
    console.log(`Initial admin account created: ${email}`);
    if (!process.env.ADMIN_PASSWORD) console.warn("IMPORTANT: Change the initial admin password before public deployment.");
  }
}

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(session({
  name: "futurepath.sid",
  secret: process.env.SESSION_SECRET || "development-only-change-this-secret-before-deployment",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 2 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, "public")));

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "Please log in as an administrator." });
}

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/session", (req, res) => res.json({
  isAdmin: Boolean(req.session && req.session.isAdmin),
  adminEmail: req.session?.isAdmin ? req.session.adminEmail : null
}));

app.post("/api/registrations", (req, res) => {
  const body = req.body || {};
  const required = ["fullName", "dob", "phone", "email", "province", "school", "schoolProvince", "graduationYear", "university", "studyLevel", "major"];
  const missing = required.filter(k => !clean(body[k], 500));
  if (missing.length) return res.status(400).json({ error: "Please complete all required fields.", fields: missing });
  const email = clean(body.email, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Please enter a valid email address." });
  const registrations = getRegistrations();
  const id = "FP-" + new Date().getFullYear() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const record = {
    id, status: "Pending", submittedAt: new Date().toISOString(),
    fullName: clean(body.fullName, 160), gender: clean(body.gender, 40),
    dob: clean(body.dob, 20), phone: clean(body.phone, 60), email,
    province: clean(body.province, 100), address: clean(body.address, 300),
    school: clean(body.school, 200), schoolProvince: clean(body.schoolProvince, 100),
    graduationYear: clean(body.graduationYear, 30), examResult: clean(body.examResult, 100),
    university: clean(body.university, 200), studyLevel: clean(body.studyLevel, 100),
    major: clean(body.major, 160), studyMode: clean(body.studyMode, 80),
    startYear: clean(body.startYear, 30), budget: clean(body.budget, 100),
    scholarship: clean(body.scholarship, 80), motivation: clean(body.motivation, 2000),
    transcriptFileName: clean(body.transcriptFileName, 200), identityFileName: clean(body.identityFileName, 200)
  };
  registrations.unshift(record);
  saveRegistrations(registrations);
  res.status(201).json({ message: "Registration submitted successfully.", id });
});

app.post("/api/admin/login", async (req, res) => {
  const email = clean(req.body.email, 200).toLowerCase();
  const password = String(req.body.password || "");
  const admin = readJson(ADMIN_FILE, null);
  if (!admin || email !== admin.email || !(await bcrypt.compare(password, admin.passwordHash))) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "Could not create session." });
    req.session.isAdmin = true;
    req.session.adminEmail = admin.email;
    res.json({ message: "Logged in successfully." });
  });
});
app.post("/api/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => res.json({ message: "Logged out." }));
});
app.get("/api/admin/registrations", requireAdmin, (req, res) => {
  const records = getRegistrations();
  const q = clean(req.query.q, 200).toLowerCase();
  const status = clean(req.query.status, 40);
  const filtered = records.filter(r => {
    const haystack = [r.id, r.fullName, r.email, r.phone, r.school, r.university, r.major].join(" ").toLowerCase();
    return (!q || haystack.includes(q)) && (!status || r.status === status);
  });
  res.json({ total: records.length, registrations: filtered });
});
app.get("/api/admin/registrations.csv", requireAdmin, (req, res) => {
  const records = getRegistrations();
  const cols = ["id","submittedAt","status","fullName","dob","phone","email","province","school","schoolProvince","graduationYear","examResult","university","studyLevel","major","studyMode","startYear","budget","scholarship","motivation"];
  const quote = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const csv = [cols.join(","), ...records.map(r => cols.map(c => quote(r[c])).join(","))].join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="futurepath-registrations.csv"');
  res.send("\uFEFF" + csv);
});
app.patch("/api/admin/registrations/:id", requireAdmin, (req, res) => {
  const allowed = ["Pending", "Under Review", "Contacted", "Accepted", "Rejected"];
  const status = clean(req.body.status, 40);
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status." });
  const records = getRegistrations();
  const record = records.find(r => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: "Registration not found." });
  record.status = status;
  record.updatedAt = new Date().toISOString();
  saveRegistrations(records);
  res.json({ message: "Status updated.", registration: record });
});
app.get("/api/admin/registrations/:id", requireAdmin, (req, res) => {
  const record = getRegistrations().find(r => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: "Registration not found." });
  res.json(record);
});

initializeAdmin().then(() => {
  app.listen(PORT, "0.0.0.0", () => console.log(`FuturePath is running at http://localhost:${PORT}`));
}).catch(err => { console.error(err); process.exit(1); });
