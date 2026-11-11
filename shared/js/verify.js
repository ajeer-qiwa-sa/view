// Ajeer QR verification page — static GitHub Pages client.
// Contract records are fetched through the public Edge Function; this page never calls Hostinger.
const VERIFY_API = "https://pbyeagtiupzqyjdycbyv.supabase.co/functions/v1/ajeer-verify";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8cKY0gbo8OLRWyzPGUtE3A_KwudbDok";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
let captchaProcessing = false;

// Preserves the supplied visual interaction. It is an animation, not a security CAPTCHA.
function triggerCaptchaClick(e) {
  if (e) e.stopPropagation();
  if (captchaProcessing) return;
  captchaProcessing = true;
  const checkbox = document.getElementById("rcCheckbox");
  const spinner = document.getElementById("rcSpinner");
  const checkmark = document.getElementById("rcCheckmark");
  if (checkbox) checkbox.style.display = "none";
  if (spinner) spinner.style.display = "block";
  setTimeout(() => {
    if (spinner) spinner.style.display = "none";
    if (checkmark) checkmark.style.display = "block";
    setTimeout(() => {
      const modal = document.getElementById("captchaModal");
      if (!modal) return;
      modal.style.transition = "opacity 0.4s ease, transform 0.4s ease";
      modal.style.opacity = "0";
      modal.style.transform = "scale(0.97)";
      setTimeout(() => { modal.style.display = "none"; }, 400);
    }, 400);
  }, 5000);
}
window.triggerCaptchaClick = triggerCaptchaClick;
function onCaptchaSuccess() {
  const modal = document.getElementById("captchaModal");
  if (modal) modal.style.display = "none";
}
window.onCaptchaSuccess = onCaptchaSuccess;
function goHome() { window.location.href = "https://ajeer.qiwa.sa/landing/"; }
window.goHome = goHome;

function renderError(container, message) {
  container.innerHTML = `
    <div class="verify-container">
      <div class="info-card text-center py-5">
        <div class="card-content">
          <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
          <h4 class="mt-3 fw-bold text-slate-800">تعذر التحقق من البيانات</h4>
          <p class="text-muted mt-2">${escapeHtml(message)}</p>
        </div>
      </div>
    </div>`;
}
function renderVerification(container, contract) {
  const isBlocked = !!contract.isBlocked;
  container.innerHTML = `
    <div class="info-card">
      <div class="card-header">معلومات التصريح</div>
      <div class="card-content">
        <div class="data-row"><span class="label">اسم الموظف</span><span class="value">${escapeHtml(contract.workerName || "-")}</span></div>
        <div class="data-row">
          <span class="label">حالة التصريح</span>
          <span class="value"><span class="status-badge ${isBlocked ? "blocked" : ""}">${isBlocked ? "موقوف" : "ساري"}</span></span>
        </div>
        <div class="data-row"><span class="label">تاريخ بداية التصريح</span><span class="value">${escapeHtml(formatDate(contract.startDate))}</span></div>
        <div class="data-row"><span class="label">تاريخ انتهاء التصريح</span><span class="value">${escapeHtml(formatDate(contract.endDate))}</span></div>
      </div>
    </div>
    <div class="info-card">
      <div class="card-header">المنشأة المستفيدة</div>
      <div class="card-content">
        <div class="data-row"><span class="label">اسم المنشأة</span><span class="value">${escapeHtml(contract.beneficiaryEntity || "-")}</span></div>
        <div class="data-row"><span class="label">رقم المنشأة</span><span class="value">${escapeHtml(contract.beneficiaryHrId || "-")}</span></div>
      </div>
    </div>
    <div class="info-card">
      <div class="card-header">شركة الاستقدام</div>
      <div class="card-content">
        <div class="data-row"><span class="label">اسم المنشأة</span><span class="value">${escapeHtml(contract.providerEntity || "-")}</span></div>
        <div class="data-row"><span class="label">رقم المنشأة</span><span class="value">${escapeHtml(contract.providerHrId || "-")}</span></div>
      </div>
    </div>
    <div class="action-btn-container">
      <button class="action-btn" onclick="copyLink()"><span>نسخ رابط الصفحة</span><i class="bi bi-link-45deg"></i></button>
    </div>`;
}
function copyLink() {
  const done = () => {
    const btn = document.querySelector(".action-btn");
    if (!btn) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>تم النسخ بنجاح</span> <i class="bi bi-check2"></i>';
    btn.style.backgroundColor = "#22c55e";
    setTimeout(() => { btn.innerHTML = originalText; btn.style.backgroundColor = "#1e3a8a"; }, 2000);
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(window.location.href).then(done).catch(copyFallback);
  } else copyFallback();
}
function copyFallback() {
  const field = document.createElement("textarea");
  field.value = window.location.href;
  document.body.appendChild(field);
  field.select();
  try { document.execCommand("copy"); } catch (_) {}
  field.remove();
}
window.copyLink = copyLink;

function isExpired(endDate) {
  if (!endDate) return false;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return end < today;
}

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  // The existing printed QR codes pass the Supabase UUID as `id`; keep `num` as fallback.
  const identifier = (params.get("id") || params.get("num") || "").trim();
  const container = document.getElementById("main-content") || document.getElementById("verifyCardContainer");
  if (!container) return;
  if (!identifier) {
    renderError(container, "لم يتم توفير معرّف العقد للتحقق");
    return;
  }
  try {
    const endpoint = new URL(VERIFY_API);
    endpoint.searchParams.set("id", identifier);
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "apikey": SUPABASE_PUBLISHABLE_KEY
      },
      cache: "no-store"
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 404) {
      renderError(container, "العقد المطلوب غير موجود في النظام");
      return;
    }
    if (response.status === 429) {
      renderError(container, "عدد محاولات التحقق كبير. يرجى المحاولة بعد قليل");
      return;
    }
    if (!response.ok) {
      renderError(container, "تعذر الاتصال بخدمة التحقق في الوقت الحالي. يرجى المحاولة لاحقًا");
      return;
    }
    const contract = payload;
    if (!contract || !contract.id) {
      renderError(container, "تعذر قراءة بيانات العقد في الوقت الحالي");
      return;
    }
    // Render status on GitHub Pages; never send QR visitors to the offline server.
    contract.isBlocked = !!contract.isBlocked || isExpired(contract.endDate);
    renderVerification(container, contract);
  } catch (error) {
    console.error("Verification loading error:", error);
    renderError(container, "تعذر الاتصال بخدمة التحقق. تحقق من اتصال الإنترنت وحاول مرة أخرى");
  }
});
