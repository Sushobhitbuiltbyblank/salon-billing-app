import { createClient } from "@supabase/supabase-js";

const url = "https://uxyljbjebtsdwpesjwzy.supabase.co";
const key = "sb_publishable_NGCQEYXXwk7gUo6G3GOtAg_CBRSTZgV";

const supabase = createClient(url, key);

async function test() {
  console.log("Testing Supabase connection...");
  const { data: staff, error } = await supabase.from("staff").select("*");
  if (error) {
    console.error("Query error:", error);
  } else {
    console.log("Staff fetched successfully:", staff);
  }
}

test();
