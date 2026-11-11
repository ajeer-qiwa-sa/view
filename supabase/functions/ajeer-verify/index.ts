import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

const buckets = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const current = buckets.get(ip);
  if (!current || current.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 30;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
  if (rateLimited(ip)) return json({ error: "Too many requests. Try again shortly." }, 429);

  let identifier = "";
  try {
    if (req.method === "GET") {
      identifier = new URL(req.url).searchParams.get("id") || "";
    } else {
      const body = await req.json();
      identifier = typeof body?.id === "string" ? body.id : "";
    }
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  identifier = identifier.trim();
  if (!identifier || identifier.length > 100) {
    return json({ error: "Missing or invalid contract identifier" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  let secretKey = "";
  try {
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    secretKey = secretKeys.default || "";
  } catch {
    // Fall back to the legacy server-side secret if the project still exposes it.
  }
  secretKey = secretKey || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !secretKey) {
    console.error("Supabase URL or server-side secret is not configured");
    return json({ error: "Verification service is not configured" }, 503);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const columns = "id,contract_number,contract_type,worker_name,worker_profession,worker_id_number,worker_nationality,provider_entity,provider_hr_id,beneficiary_entity,beneficiary_hr_id,start_date,end_date,is_blocked,blocked_reason";
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
  const query = isUuid
    ? supabase.from("contracts").select(columns).eq("id", identifier).maybeSingle()
    : supabase.from("contracts").select(columns).eq("contract_number", identifier).maybeSingle();

  const { data, error } = await query;
  if (error) {
    console.error("Contract lookup failed:", error.message);
    return json({ error: "Unable to verify this contract right now" }, 503);
  }
  if (!data) return json({ error: "Contract not found" }, 404);

  return json({
    id: data.id,
    contractNumber: data.contract_number || "",
    workerName: data.worker_name || "",
    workerProfession: data.worker_profession || "",
    workerIdNumber: data.worker_id_number || "",
    workerNationality: data.worker_nationality || "",
    contractType: data.contract_type || "",
    addNumber: data.contract_number ? "TW" + String(data.contract_number).replace(/^[A-Za-z]+/, "") : "",
    providerEntity: data.provider_entity || "",
    providerHrId: data.provider_hr_id || "",
    beneficiaryEntity: data.beneficiary_entity || "",
    beneficiaryHrId: data.beneficiary_hr_id || "",
    startDate: data.start_date || "",
    endDate: data.end_date || "",
    isBlocked: !!data.is_blocked,
    blockedReason: data.blocked_reason || null
  });
});
