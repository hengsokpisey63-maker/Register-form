const form = document.getElementById("studentForm");
const requiredFields = [...form.querySelectorAll("[required]")];
const msg = document.getElementById("formMessage");
function updateProgress() {
  const count = requiredFields.filter(el => el.type === "checkbox" ? el.checked : String(el.value || "").trim() !== "").length;
  const pct = Math.round(count / requiredFields.length * 100);
  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("progressText").textContent = pct + "% complete";
}
form.addEventListener("input", updateProgress);
form.addEventListener("change", updateProgress);
form.addEventListener("reset", () => setTimeout(updateProgress, 0));
form.addEventListener("submit", async (e) => {
  e.preventDefault(); msg.textContent = "";
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    const response = await fetch("/api/registrations", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not submit registration.");
    form.classList.add("hidden");
    document.getElementById("successText").textContent = "Thank you, " + data.fullName + ". Your registration has been saved for the administrator to review.";
    document.getElementById("reference").textContent = "Reference number: " + result.id;
    document.getElementById("successPanel").classList.remove("hidden");
    window.scrollTo({top: document.getElementById("register").offsetTop - 20, behavior:"smooth"});
  } catch (err) { msg.textContent = err.message + " Please check your connection and try again."; }
});
document.getElementById("newRegistration").addEventListener("click", () => {
  form.reset(); form.classList.remove("hidden"); document.getElementById("successPanel").classList.add("hidden"); msg.textContent = ""; updateProgress();
});
const modal = document.getElementById("adminModal");
document.getElementById("adminOpen").addEventListener("click", () => modal.classList.remove("hidden"));
modal.querySelectorAll("[data-close]").forEach(el => el.addEventListener("click", () => modal.classList.add("hidden")));
document.addEventListener("keydown", e => { if (e.key === "Escape") modal.classList.add("hidden"); });
document.getElementById("adminLogin").addEventListener("submit", async e => {
  e.preventDefault();
  const m = document.getElementById("loginMessage"); m.textContent = "";
  const data = Object.fromEntries(new FormData(e.currentTarget).entries());
  try {
    const r = await fetch("/api/admin/login", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
    const result = await r.json();
    if (!r.ok) throw new Error(result.error || "Login failed.");
    window.location.href = "/admin.html";
  } catch (err) { m.textContent = err.message; }
});
updateProgress();
