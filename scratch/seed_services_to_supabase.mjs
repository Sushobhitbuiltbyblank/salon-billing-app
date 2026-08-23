import { createClient } from "@supabase/supabase-js";

const url = "https://uxyljbjebtsdwpesjwzy.supabase.co";
const key = "sb_publishable_NGCQEYXXwk7gUo6G3GOtAg_CBRSTZgV";

const supabase = createClient(url, key);

const CATEGORIES = [
  { id: "22222222-2222-2222-2222-222222222201", name: "Basic Services (Men)", type: "service", icon: "Scissors" },
  { id: "22222222-2222-2222-2222-222222222202", name: "Detan (Men)", type: "service", icon: "Sparkles" },
  { id: "22222222-2222-2222-2222-222222222203", name: "Bleach", type: "service", icon: "Sun" },
  { id: "22222222-2222-2222-2222-222222222204", name: "Facial & Mask", type: "service", icon: "Smile" },
  { id: "22222222-2222-2222-2222-222222222205", name: "Hair Spa (Loreal)", type: "service", icon: "Droplet" },
  { id: "22222222-2222-2222-2222-222222222206", name: "Hair Colour (Loreal Majirel)", type: "service", icon: "Palette" },
];

const SERVICES = [
  // 1. Basic services (Men)
  { category_id: "22222222-2222-2222-2222-222222222201", name: "Shaving", type: "service", price: 100 },
  { category_id: "22222222-2222-2222-2222-222222222201", name: "Haircut", type: "service", price: 150 },
  { category_id: "22222222-2222-2222-2222-222222222201", name: "Hair Wash - Shampoo + Conditioner", type: "service", price: 100 },
  { category_id: "22222222-2222-2222-2222-222222222201", name: "Hair Wash - Shampoo Only", type: "service", price: 50 },

  // 2. Detan (Men)
  { category_id: "22222222-2222-2222-2222-222222222202", name: "Detan - Beardo", type: "service", price: 300 },
  { category_id: "22222222-2222-2222-2222-222222222202", name: "Detan - Ozon", type: "service", price: 400 },
  { category_id: "22222222-2222-2222-2222-222222222202", name: "Detan - O3+", type: "service", price: 500 },
  { category_id: "22222222-2222-2222-2222-222222222202", name: "Detan - Kanpeki", type: "service", price: 700 },
  { category_id: "22222222-2222-2222-2222-222222222202", name: "Detan - Sara", type: "service", price: 400 },

  // 3. Bleach (Men / Women)
  { category_id: "22222222-2222-2222-2222-222222222203", name: "Bleach - Fruit", type: "service", price: 300 },
  { category_id: "22222222-2222-2222-2222-222222222203", name: "Bleach - Ozon", type: "service", price: 500 },
  { category_id: "22222222-2222-2222-2222-222222222203", name: "Bleach - Oxy", type: "service", price: 700 },

  // 4. Facial & mask
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Just O2 - Mask", type: "service", price: 500 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Just O2 - Facial", type: "service", price: 1500 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Aroma Magic - Facial", type: "service", price: 1500 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - O3+ - Whitening", type: "service", price: 2500 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - O3+ - Power Glow Cleanup", type: "service", price: 2000 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - O3+ - MelaDerm", type: "service", price: 4000 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - O3+ - Derma Cult", type: "service", price: 2000 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Beardo - Power Glow", type: "service", price: 1500 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Beardo - War Zone", type: "service", price: 1500 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Beardo - Gold", type: "service", price: 1500 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Lotus - Gold Sheen", type: "service", price: 2000 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Lotus - Insta Fair", type: "service", price: 2000 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Sara - Korean Facial", type: "service", price: 4200 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Kanpeki - 4-Step", type: "service", price: 2000 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Kanpeki - Mango", type: "service", price: 2500 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Kanpeki - Papaya", type: "service", price: 4000 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Kanpeki - Coconut", type: "service", price: 2500 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Kanpeki - Avocado", type: "service", price: 2500 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Kanpeki - Pumpkin", type: "service", price: 2500 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Kanpeki - Quinoa", type: "service", price: 2500 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Kanpeki - Chocolate", type: "service", price: 2500 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Ozone - De-Tan", type: "service", price: 2000 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Ozone - Glow For Sure", type: "service", price: 2500 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Ozone - Acne", type: "service", price: 2000 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Ozone - PST", type: "service", price: 2000 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Ozone - CBT", type: "service", price: 2000 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Ozone - Restoring Youth", type: "service", price: 2000 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Ozone - Vitamin C", type: "service", price: 2000 },
  { category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Ozone - Illuminous Gold", type: "service", price: 2500 },

  // 5. Men's hair spa (Loreal)
  { category_id: "22222222-2222-2222-2222-222222222205", name: "Hair Spa - Loreal - Nourishment", type: "service", price: 600 },
  { category_id: "22222222-2222-2222-2222-222222222205", name: "Hair Spa - Loreal - Absolute Repair", type: "service", price: 1000 },
  { category_id: "22222222-2222-2222-2222-222222222205", name: "Hair Spa - Loreal - Liss Unlimited", type: "service", price: 1000 },
  { category_id: "22222222-2222-2222-2222-222222222205", name: "Hair Spa - Loreal - Inforcer", type: "service", price: 1000 },
  { category_id: "22222222-2222-2222-2222-222222222205", name: "Hair Spa - Loreal - Vitamin O", type: "service", price: 1000 },
  { category_id: "22222222-2222-2222-2222-222222222205", name: "Hair Spa - Loreal - Scalp Advance", type: "service", price: 1500 },
  { category_id: "22222222-2222-2222-2222-222222222205", name: "Hair Spa - Loreal - Absolute Repair Molecule", type: "service", price: 2500 },

  // 6. Men's hair colour (Loreal Majirel)
  { category_id: "22222222-2222-2222-2222-222222222206", name: "Hair Colour - Loreal Majirel - Base 3 No", type: "service", price: 600 },
  { category_id: "22222222-2222-2222-2222-222222222206", name: "Hair Colour - Loreal Majirel - Base 3 No Inoa", type: "service", price: 800 },
];

async function seed() {
  console.log("Seeding categories into Supabase...");
  const { error: catErr } = await supabase.from("categories").upsert(CATEGORIES);
  if (catErr) {
    console.error("Error upserting categories:", catErr);
    return;
  }
  console.log("Categories upserted successfully!");

  console.log("Cleaning old catalog and inserting new services...");
  await supabase.from("catalog_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const itemsToInsert = SERVICES.map((srv, idx) => {
    const hexIndex = (idx + 1).toString().padStart(4, "0");
    return {
      id: `33333333-3333-3333-3333-33333333${hexIndex}`,
      category_id: srv.category_id,
      name: srv.name,
      type: srv.type,
      price: srv.price,
      cost_price: 0,
      is_active: true,
    };
  });

  const { data, error: srvErr } = await supabase.from("catalog_items").insert(itemsToInsert).select();
  if (srvErr) {
    console.error("Error inserting services:", srvErr);
  } else {
    console.log(`Successfully seeded ${data.length} services into Supabase!`);
  }
}

seed();
