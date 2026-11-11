// Additional permit verification — static GitHub Pages + Supabase REST only.
const ADD_SB_URL="https://pbyeagtiupzqyjdycbyv.supabase.co";
const ADD_SB_KEY="sb_publishable_8cKY0gbo8OLRWyzPGUtE3A_KwudbDok";
const ADD_SELECT="id,contract_number,contract_type,worker_name,worker_profession,worker_id_number,worker_nationality,provider_entity,provider_hr_id,start_date,end_date,is_blocked";
function addSet(id,value){const e=document.getElementById(id);if(e)e.textContent=value==null||String(value).trim()===""?"-":String(value);}
function addDate(v){if(!v)return "-";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
document.addEventListener("DOMContentLoaded",async()=>{
 const p=new URLSearchParams(location.search),id=(p.get("id")||"").trim(),num=(p.get("num")||"").trim();
 const loading=document.getElementById("loading"),content=document.getElementById("verificationContent"),error=document.getElementById("errorBox");
 const fail=m=>{if(loading)loading.hidden=true;if(content)content.hidden=true;if(error){error.textContent=m;error.hidden=false;}};
 if(!id){fail("رابط التصريح غير مكتمل: معرّف العقد غير موجود.");return;}
 try{
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  const q=new URLSearchParams({select:ADD_SELECT,[uuid?"id":"contract_number"]:"eq."+id,limit:"1"});
  const r=await fetch(ADD_SB_URL+"/rest/v1/contracts?"+q,{headers:{apikey:ADD_SB_KEY,Authorization:"Bearer "+ADD_SB_KEY,Accept:"application/json"},cache:"no-store"});
  if(!r.ok){fail(r.status===404?"العقد غير موجود.":"تعذر الاتصال بخدمة التحقق ("+r.status+").");return;}
  const rows=await r.json(),d=rows[0];if(!d){fail("العقد المطلوب غير موجود في قاعدة البيانات.");return;}
  const end=d.end_date?new Date(d.end_date):null,today=new Date();today.setHours(0,0,0,0);if(end)end.setHours(0,0,0,0);
  const expired=!!(end&&end<today),blocked=!!d.is_blocked||expired;
  addSet("permitNumber",num||("TW"+String(d.contract_number||"").replace(/^[A-Za-z]+/,"")));
  addSet("permitType","تصريح إعارة أجير");addSet("issueDate",addDate(d.start_date));addSet("expiryDate",addDate(d.end_date));
  addSet("workerName",d.worker_name);addSet("workerIdNumber",d.worker_id_number);addSet("nationality",d.worker_nationality);addSet("occupation",d.worker_profession);
  addSet("gender","ذكر");addSet("birthDate","-");addSet("providerHrId",d.provider_hr_id);addSet("providerEntity",d.provider_entity);
  const badge=document.getElementById("statusBadge"),message=document.getElementById("statusMessage");
  if(badge){badge.textContent=blocked?(expired?"منتهي":"موقوف"):"ساري / فعال";badge.classList.add("verification-result--"+(blocked?"expired":"valid"));}
  if(message)message.textContent=blocked?(expired?"انتهت صلاحية هذا التصريح ولا يمكن استخدامه":"هذا التصريح موقوف"):"تم التحقق من التصريح بنجاح";
  if(loading)loading.hidden=true;if(content)content.hidden=false;
 }catch(e){console.error("Additional permit verification:",e);fail("تعذر الاتصال بقاعدة بيانات Supabase. حاول مرة أخرى.");}
});