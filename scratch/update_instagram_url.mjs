import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uxyljbjebtsdwpesjwzy.supabase.co";
const supabaseKey = "sb_publishable_NGCQEYXXwk7gUo6G3GOtAg_CBRSTZgV";

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateInstagramUrl() {
  const { data, error } = await supabase
    .from("salon_settings")
    .update({ instagram_url: "https://www.instagram.com/beleziasalonlaxminagar?igsi=MTI0ZG85dGRvdTl6aQ%3D%3D&utm_source=qr" })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    console.error("Error updating settings:", error);
  } else {
    console.log("Successfully updated Instagram URL in Supabase to https://www.instagram.com/beleziasalonlaxminagar?igsi=MTI0ZG85dGRvdTl6aQ%3D%3D&utm_source=qr");
  }
}

updateInstagramUrl();
