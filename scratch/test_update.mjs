import { createClient } from "@supabase/supabase-js";

const url = "https://uxyljbjebtsdwpesjwzy.supabase.co";
const key = "sb_publishable_NGCQEYXXwk7gUo6G3GOtAg_CBRSTZgV";

const supabase = createClient(url, key);

async function testUpdate() {
  console.log("Testing staff update on Supabase...");
  const { data, error } = await supabase
    .from("staff")
    .update({ commission_rate: 20 })
    .eq("id", "11111111-1111-1111-1111-111111111101")
    .select();

  if (error) {
    console.error("Update error:", error);
  } else {
    console.log("Update success! Result:", data);
  }
}

testUpdate();
