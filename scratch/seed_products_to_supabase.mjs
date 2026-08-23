import { createClient } from "@supabase/supabase-js";

const url = "https://uxyljbjebtsdwpesjwzy.supabase.co";
const key = "sb_publishable_NGCQEYXXwk7gUo6G3GOtAg_CBRSTZgV";

const supabase = createClient(url, key);

const PRODUCT_CATEGORIES = [
  { id: "22222222-2222-2222-2222-222222222207", name: "Haircare Products", type: "product", icon: "Package" },
  { id: "22222222-2222-2222-2222-222222222208", name: "Skincare Products", type: "product", icon: "Droplet" },
];

const PRODUCTS = [
  // Haircare Products (L'Oreal, Krone, Godrej, 72, Pro Viva, Loreal KAS)
  { category_id: "22222222-2222-2222-2222-222222222207", name: "L'Oréal Absolute Repair - Shampoo", price: 790, sku: "PRD-LRL-01" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "L'Oréal xtansho Blue - Shampoo", price: 690, sku: "PRD-LRL-02" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "L'Oréal xtansho Blue - Mask", price: 850, sku: "PRD-LRL-03" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "L'Oréal xtansho Gold - Shampoo", price: 1120, sku: "PRD-LRL-04" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "L'Oréal xtansho Gold - Mask", price: 1290, sku: "PRD-LRL-05" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "Krone - Shampoo", price: 850, sku: "PRD-KRN-01" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "Krone - Mask", price: 600, sku: "PRD-KRN-02" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "Godrej - Serum", price: 299, sku: "PRD-GDJ-01" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "Godrej - Keracare Shampoo", price: 1200, sku: "PRD-GDJ-02" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "Godrej - Keracare Conditioner", price: 1200, sku: "PRD-GDJ-03" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "72 - Shampoo", price: 1395, sku: "PRD-72-01" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "72 - Mask", price: 1695, sku: "PRD-72-02" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "72 - Serum", price: 1195, sku: "PRD-72-03" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "72 - Conditioner", price: 1395, sku: "PRD-72-04" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "Pro Viva Smooth - Shampoo", price: 1150, sku: "PRD-PV-01" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "Pro Viva Smooth - Conditioner", price: 1200, sku: "PRD-PV-02" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "Pro Viva Hydration - Shampoo", price: 1150, sku: "PRD-PV-03" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "Pro Viva Hydration - Conditioner", price: 1200, sku: "PRD-PV-04" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "Pro Viva Repair - Shampoo", price: 1150, sku: "PRD-PV-05" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "Pro Viva Repair - Conditioner", price: 1200, sku: "PRD-PV-06" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "Loreal KAS - Shampoo", price: 990, sku: "PRD-KAS-01" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "Loreal KAS - Mask", price: 1290, sku: "PRD-KAS-02" },
  { category_id: "22222222-2222-2222-2222-222222222207", name: "Loreal KAS - Transform Creame", price: 1800, sku: "PRD-KAS-03" },

  // Skincare Products (ABC, C-10, Ozone, Kanpeki)
  { category_id: "22222222-2222-2222-2222-222222222208", name: "ABC - Serum", price: 1799, sku: "PRD-ABC-01" },
  { category_id: "22222222-2222-2222-2222-222222222208", name: "C-10 - Serum", price: 1199, sku: "PRD-C10-01" },
  { category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Face Oil - Oil", price: 1903, sku: "PRD-OZN-01" },
  { category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Complexion Brightening - Facewash", price: 290, sku: "PRD-OZN-02" },
  { category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Complexion Brightening - Cream", price: 350, sku: "PRD-OZN-03" },
  { category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Perfect Skin Tone - Facewash", price: 290, sku: "PRD-OZN-04" },
  { category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Perfect Skin Tone - Cream", price: 350, sku: "PRD-OZN-05" },
  { category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Youth Restoring - Facewash", price: 290, sku: "PRD-OZN-06" },
  { category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Youth Restoring - Cream", price: 350, sku: "PRD-OZN-07" },
  { category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Acne Check - Facewash", price: 290, sku: "PRD-OZN-08" },
  { category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Acne Check - Cream", price: 350, sku: "PRD-OZN-09" },
  { category_id: "22222222-2222-2222-2222-222222222208", name: "Kanpeki - Balancing Cleanser", price: 960, sku: "PRD-KNP-01" },
  { category_id: "22222222-2222-2222-2222-222222222208", name: "Kanpeki - Facial Wash", price: 960, sku: "PRD-KNP-02" },
];

async function seedProducts() {
  console.log("Upserting product categories in Supabase...");
  const { error: catErr } = await supabase.from("categories").upsert(PRODUCT_CATEGORIES);
  if (catErr) {
    console.error("Categories error:", catErr);
    return;
  }
  console.log("Product categories upserted successfully!");

  // Delete previous products
  await supabase.from("catalog_items").delete().eq("type", "product");

  const productPayloads = PRODUCTS.map((prd, idx) => {
    const hexIndex = (idx + 101).toString().padStart(4, "0");
    return {
      id: `33333333-3333-3333-3333-33333333${hexIndex}`,
      category_id: prd.category_id,
      name: prd.name,
      type: "product",
      price: prd.price,
      cost_price: 0,
      sku: prd.sku,
      stock_qty: 25,
      is_active: true,
    };
  });

  console.log(`Inserting ${productPayloads.length} retail products into Supabase...`);
  const { data, error: prdErr } = await supabase.from("catalog_items").insert(productPayloads).select();
  if (prdErr) {
    console.error("Error inserting products:", prdErr);
  } else {
    console.log(`Successfully seeded ${data.length} retail products into Supabase!`);
  }
}

seedProducts();
