import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uxyljbjebtsdwpesjwzy.supabase.co";
const supabaseKey = "sb_publishable_NGCQEYXXwk7gUo6G3GOtAg_CBRSTZgV";

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateReviewUrl() {
  const { data, error } = await supabase
    .from("salon_settings")
    .update({ google_review_url: "https://g.page/r/CbGd_cwnL9zrEBM/review" })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    console.error("Error updating settings:", error);
  } else {
    console.log("Successfully updated Google Review URL in Supabase to https://g.page/r/CbGd_cwnL9zrEBM/review");
  }
}

updateReviewUrl();
