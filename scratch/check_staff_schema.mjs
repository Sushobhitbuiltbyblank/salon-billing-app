import { createClient } from "@supabase/supabase-js";

const url = "https://uxyljbjebtsdwpesjwzy.supabase.co";
const key = "sb_publishable_NGCQEYXXwk7gUo6G3GOtAg_CBRSTZgV";

const supabase = createClient(url, key);

async function checkStaffSchema() {
  const { data, error } = await supabase.from("staff").select("*").limit(1);
  console.log("Current staff sample:", data, error);
}

checkStaffSchema();
