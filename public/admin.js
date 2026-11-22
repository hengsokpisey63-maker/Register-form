let currentRecordId = null;
const body = document.getElementById("registrationsBody");
const errorBox = document.getElementById("adminError");
const detailModal = document.getElementById("detailModal");
function esc(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function prettyDate(v) { if (!v) return "—"; const d = new Date(v); return isNaN(d) ? esc(v) : d.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}); }
function statusClass(s) { return s === "Accepted" ? "accepted" : s === "Rejected" ? "rejected" : s === "Under Review" ? "review" : s === "Contacted" ? "contacted" : ""; }
async function api(url, options={}) {
  const r = await fetch(url, options);
  const data = await r.json().catch(()=>({}));
  if (r.status === 401) { window.location.href="/"; throw new Error("Please log in again."); }
  if (!r.ok) throw new Error(data.error || "Request failed.");
  return data;
}
async function loadRegistrations() {
  errorBox.textContent = "";
  body.innerHTML = '<tr><td colspan="6" class="empty">Loading registrations…</td></tr>';
  try {
    const params = new URLSearchParams();
    if (document.getElementById("searchInput").value.trim()) params.set("q", document.getElementById("searchInput").value.trim());
    if (document.getElementById("statusFilter").value) params.set("status", document.getElementById("statusFilter").value);
    const data = await api("/api/admin/registrations?" + params.toString());
    const all = await api("/api/admin/registrations");
    document.getElementById("totalStat").textContent = all.total;
    document.getElementById("pendingStat").textContent = all.registrations.filter(x=>x.status==="Pending").length;
    document.getElementById("acceptedStat").textContent = all.registrations.filter(x=>x.status==="Accepted").length;
    document.getElementById("scholarshipStat").textContent = all.registrations.filter(x=>x.scholarship==="Yes" || x.scholarship==="Need more information").length;
    if (!data.registrations.length) { body.innerHTML = ""; document.getElementById("emptyState").classList.remove("hidden"); return; }
    document.getElementById("emptyState").classList.add("hidden");
    body.innerHTML = data.registrations.map(r => `<tr>
      <td><b>${esc(r.fullName)}</b><small>${esc(r.email)}</small></td>
      <td><b>${esc(r.school)}</b><small>Graduated ${esc(r.graduationYear)}</small></td>
      <td><b>${esc(r.university)}</b><small>${esc(r.major)}</small></td>
      <td>${prettyDate(r.submittedAt)}</td>
      <td><span class="status-pill ${statusClass(r.status)}">${esc(r.status)}</span></td>
      <td><button class="table-btn" data-detail="${esc(r.id)}">View record ↗</button></td>
    </tr>`).join("");
    body.querySelectorAll("[data-detail]").forEach(b=>b.addEventListener("click",()=>showDetails(b.dataset.detail)));
  } catch (err) { errorBox.textContent = err.message; body.innerHTML = '<tr><td colspan="6" class="empty">Unable to load registrations.</td></tr>'; }
}
async function showDetails(id) {
  try {
    const r = await api("/api/admin/registrations/" + encodeURIComponent(id));
    currentRecordId = id;
    document.getElementById("detailName").textContent = r.fullName;
    const items = [
      ["Reference",r.id],["Submitted",prettyDate(r.submittedAt)],["Status",r.status],
      ["Date of birth",r.dob],["Gender",r.gender],["Phone",r.phone],["Email",r.email],
      ["Province / city",r.province],["Address",r.address],["High school",r.school],
      ["School province",r.schoolProvince],["Graduation year",r.graduationYear],["Bac II result",r.examResult],
      ["University",r.university],["Study level",r.studyLevel],["Major",r.major],["Study preference",r.studyMode],
      ["Intended start year",r.startYear],["Yearly budget",r.budget],["Scholarship interest",r.scholarship],
      ["Transcript file name",r.transcriptFileName],["ID file name",r.identityFileName],["Study goals",r.motivation]
    ];
    document.getElementById("detailContent").innerHTML = items.map(([k,v])=>`<div class="detail-item ${k==="Study goals"||k==="Address"?"wide":""}"><span>${esc(k)}</span><b>${esc(v || "—")}</b></div>`).join("");
    document.getElementById("detailStatus").value = r.status;
    document.getElementById("detailMessage").textContent = "";
    detailModal.classList.remove("hidden");
  } catch (err) { errorBox.textContent = err.message; }
}
detailModal.querySelectorAll("[data-close]").forEach(el=>el.addEventListener("click",()=>detailModal.classList.add("hidden")));
document.getElementById("saveStatus").addEventListener("click", async()=>{
  if (!currentRecordId) return;
  const m = document.getElementById("detailMessage"); m.textContent = "";
  try {
    await api("/api/admin/registrations/"+encodeURIComponent(currentRecordId),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:document.getElementById("detailStatus").value})});
    m.style.color="#18794e";m.textContent="Status updated successfully."; await loadRegistrations();
  } catch(err) { m.style.color="#b42318";m.textContent=err.message; }
});
document.getElementById("refreshBtn").addEventListener("click",loadRegistrations);
document.getElementById("statusFilter").addEventListener("change",loadRegistrations);
let searchTimer; document.getElementById("searchInput").addEventListener("input",()=>{clearTimeout(searchTimer);searchTimer=setTimeout(loadRegistrations,250)});
document.getElementById("logoutBtn").addEventListener("click",async()=>{try{await api("/api/admin/logout",{method:"POST"});}finally{window.location.href="/";}});
(async()=>{try{const s=await api("/api/session");if(!s.isAdmin){window.location.href="/";return;}document.getElementById("adminIdentity").textContent=s.adminEmail;await loadRegistrations();}catch{} })();
