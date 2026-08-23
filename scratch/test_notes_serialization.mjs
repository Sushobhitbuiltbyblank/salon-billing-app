import { createClient } from "@supabase/supabase-js";

const url = "https://uxyljbjebtsdwpesjwzy.supabase.co";
const key = "sb_publishable_NGCQEYXXwk7gUo6G3GOtAg_CBRSTZgV";

const supabase = createClient(url, key);

async function testNotesSerialization() {
  const meta = {
    commission_type: "fixed",
    product_commission_rate: 100,
    product_commission_type: "fixed",
    custom_notes: "Senior Stylist with flat incentives",
  };

  const { data, error } = await supabase
    .from("staff")
    .update({
      commission_rate: 150, // ₹150 flat per service
      notes: JSON.stringify(meta),
    })
    .eq("id", "11111111-1111-1111-1111-111111111101")
    .select();

  console.log("Updated staff in Supabase:", data, error);
}

testNotesSerialization();
