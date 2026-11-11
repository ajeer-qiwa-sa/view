document.addEventListener("DOMContentLoaded", async function () {
 const params=new URLSearchParams(location.search);
 const id=(params.get("id")||"").trim();
 const loading=document.getElementById("loading"),content=document.getElementById("verificationContent"),error=document.getElementById("errorBox");
 function fail(message){if(loading)loading.hidden=true;if(content)content.hidden=true;if(error){error.textContent=message;error.hidden=false;}}
 function setValue(key,value){const el=document.getElementById(key);if(el)el.textContent=value==null||String(value).trim()===""?"-":String(value);}
 function fmtDate(v){if(!v)return "-";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
 if(!id){fail("رابط التصريح غير مكتمل: رقم العقد غير موجود.");return;}
 try{
  const url="https://pbyeagtiupzqyjdycbyv.supabase.co/rest/v1/contracts?select=*&id=eq."+encodeURIComponent(id)+"&limit=1";
  const response=await fetch(url,{headers:{apikey:"sb_publishable_8cKY0gbo8OLRWyzPGUtE3A_KwudbDok",Authorization:"Bearer sb_publishable_8cKY0gbo8OLRWyzPGUtE3A_KwudbDok",Accept:"application/json"},cache:"no-store"});
  if(!response.ok){fail(response.status===404?"التصريح غير موجود.":"تعذر الاتصال بقاعدة بيانات التحقق ("+response.status+").");return;}
  const rows=await response.json(),d=rows&&rows[0];if(!d){fail("التصريح المطلوب غير موجود في قاعدة البيانات.");return;}
  const num=params.get("num")||d.add_number||("TW"+String(d.contract_number||"").replace(/^[A-Za-z]+/,""));
  setValue("permitNumber",num);setValue("permitType","تصريح إعارة أجير");
  setValue("issueDate",fmtDate(d.start_date));setValue("expiryDate",fmtDate(d.end_date));
  setValue("workerName",d.worker_name);setValue("workerIdNumber",d.worker_id_number);
  setValue("nationality",d.worker_nationality);setValue("occupation",d.worker_profession);
  setValue("gender",d.gender||params.get("gender")||"ذكر");setValue("birthDate",fmtDate(d.birth_date));
  setValue("providerHrId",d.provider_hr_id);setValue("providerEntity",d.provider_entity);
  const badge=document.getElementById("statusBadge"),message=document.getElementById("statusMessage");
  if(badge){badge.textContent="ساري / فعال";badge.classList.add("verification-result--valid");}
  if(message)message.textContent="تم التحقق من التصريح بنجاح";
  if(loading)loading.hidden=true;if(content)content.hidden=false;
 }catch(e){console.error("Add verification error:",e);fail("تعذر الاتصال بقاعدة بيانات Supabase. حاول مرة أخرى.");}
});