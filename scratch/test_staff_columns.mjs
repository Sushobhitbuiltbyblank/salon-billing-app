import { createClient } from "@supabase/supabase-js";

const url = "https://uxyljbjebtsdwpesjwzy.supabase.co";
const key = "sb_publishable_NGCQEYXXwk7gUo6G3GOtAg_CBRSTZgV";

const supabase = createClient(url, key);

async function testStaffColumns() {
  const { data, error } = await supabase
    .from("staff")
    .update({
      commission_type: "fixed",
    })
    .eq("id", "11111111-1111-1111-1111-111111111102")
    .select();

  console.log("Result:", data, error);
}

testStaffColumns();
