let captchaProcessing = false;
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
// GitHub Pages-only contract verification via the Supabase public REST API.
const SB_URL="https://satqfzfsyhzbvwqxcbny.supabase.co";
const SB_KEY="sb_publishable_J3qkvU96G6bLH8FHvd1VlA_Y-tvpMT_";
const SELECT="id,contract_number,add_number,contract_type,worker_name,worker_profession,worker_id_number,worker_nationality,provider_entity,provider_hr_id,beneficiary_entity,beneficiary_hr_id,start_date,end_date,is_blocked,blocked_reason,created_at";
function esc(v){return String(v??"-").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function date(v){if(!v)return "-";const d=new Date(v);return Number.isNaN(d.getTime())?esc(v):d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function expired(v){if(!v)return false;const d=new Date(v);if(Number.isNaN(d.getTime()))return false;d.setHours(0,0,0,0);const t=new Date();t.setHours(0,0,0,0);return d<t;}
function errorBox(el,msg){el.innerHTML='<div class="info-card"><div class="card-content"><h4>تعذر التحقق من البيانات</h4><p>'+esc(msg)+'</p></div></div>';}
function copyLink(){const b=document.querySelector(".action-btn"),old=b?.innerHTML;navigator.clipboard?.writeText(location.href).then(()=>{if(b){b.textContent="تم النسخ بنجاح";setTimeout(()=>b.innerHTML=old,1800);}}).catch(()=>{});}
window.copyLink=copyLink;
document.addEventListener("DOMContentLoaded",async()=>{
 const p=new URLSearchParams(location.search),id=(p.get("id")||p.get("num")||"").trim(),el=document.getElementById("main-content")||document.getElementById("verifyCardContainer");
 if(!el)return;if(!id){errorBox(el,"رابط التحقق لا يحتوي على رقم العقد.");return;}
 try{
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  const headers={apikey:SB_KEY,Accept:"application/json"};
  async function lookup(column,value){
   if(!value)return null;
   const filter=column==="worker_name"?"ilike.*"+String(value).trim()+"*":"eq."+value;
   const q=new URLSearchParams({select:SELECT,[column]:filter,limit:"1",order:"created_at.desc"});
   const r=await fetch(SB_URL+"/rest/v1/contracts?"+q,{headers,cache:"no-store"});
   if(!r.ok)throw new Error("Supabase "+r.status);
   const rows=await r.json();
   return Array.isArray(rows)&&rows.length?rows[0]:null;
  }
  // Map known legacy QR UUIDs to their confirmed production contract IDs.
  const legacyIds = {
   "0993aa5d-ad51-4cf4-993c-81993139a7ed":"c2eac7fe-a0af-4510-ab07-dc29f49d9316",
   "feaa67fb-1b0e-45a4-9d7c-c8301fbce678":"57018ba6-269a-4c88-a948-9e4d2edab8a6",
   "c0cb6199-5bf4-4919-abac-1c5a1f563084":"33610b09-38d8-4e79-bdf3-cf3d9706e648"
  };
  const legacyNumbers = {
   "TW53123917":"57018ba6-269a-4c88-a948-9e4d2edab8a6",
   "TW29695639":"33610b09-38d8-4e79-bdf3-cf3d9706e648"
  };
  const qrNum=(p.get("num")||"").trim();
  let d=null;
  if(uuid)d=await lookup("id",legacyIds[id]||id);
  else d=await lookup("contract_number",id);
  // Explicit legacy QR-number mappings, followed by safe database fallbacks.
  if(!d && legacyNumbers[qrNum])d=await lookup("id",legacyNumbers[qrNum]);
  if(!d)d=await lookup("add_number",qrNum);
  if(!d)d=await lookup("contract_number",qrNum);
  if(!d)d=await lookup("worker_name",(p.get("ref")||"").trim());
  if(!d){errorBox(el,"العقد غير موجود أو أن بيانات الرابط القديمة لا تطابق سجلًا واحدًا في قاعدة البيانات.");return;}
  const blocked=!!d.is_blocked||expired(d.end_date);
  const status=blocked?"موقوف":"ساري";
  el.innerHTML='<div class="info-card"><div class="card-header">معلومات التصريح</div><div class="card-content">'+
   '<div class="data-row"><span class="label">رقم العقد</span><span class="value">'+esc(d.contract_number)+'</span></div>'+
   '<div class="data-row"><span class="label">اسم الموظف</span><span class="value">'+esc(d.worker_name)+'</span></div>'+
   '<div class="data-row"><span class="label">حالة التصريح</span><span class="value"><span class="status-badge '+(blocked?"blocked":"")+'">'+status+'</span></span></div>'+
   '<div class="data-row"><span class="label">تاريخ بداية التصريح</span><span class="value">'+date(d.start_date)+'</span></div>'+
   '<div class="data-row"><span class="label">تاريخ انتهاء التصريح</span><span class="value">'+date(d.end_date)+'</span></div></div></div>'+
   '<div class="info-card"><div class="card-header">المنشأة المستفيدة</div><div class="card-content"><div class="data-row"><span class="label">اسم المنشأة</span><span class="value">'+esc(d.beneficiary_entity)+'</span></div><div class="data-row"><span class="label">رقم المنشأة</span><span class="value">'+esc(d.beneficiary_hr_id)+'</span></div></div></div>'+
   '<div class="info-card"><div class="card-header">شركة الاستقدام</div><div class="card-content"><div class="data-row"><span class="label">اسم المنشأة</span><span class="value">'+esc(d.provider_entity)+'</span></div><div class="data-row"><span class="label">رقم المنشأة</span><span class="value">'+esc(d.provider_hr_id)+'</span></div></div></div>'+
   '<div class="action-btn-container"><button class="action-btn" onclick="copyLink()">نسخ رابط الصفحة</button></div>';
 }catch(e){console.error(e);errorBox(el,"تعذر الاتصال بقاعدة بيانات Supabase. حاول مرة أخرى.");}
});