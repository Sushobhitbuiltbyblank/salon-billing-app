import { createClient } from "@supabase/supabase-js";

const url = "https://uxyljbjebtsdwpesjwzy.supabase.co";
const key = "sb_publishable_NGCQEYXXwk7gUo6G3GOtAg_CBRSTZgV";

const supabase = createClient(url, key);

const PRODUCTS_4X = [
  // Haircare Products (Category 22222222-2222-2222-2222-222222222207)
  { id: "33333333-3333-3333-3333-333333330101", category_id: "22222222-2222-2222-2222-222222222207", name: "L'Oréal Absolute Repair - Shampoo", cost_price: 790, price: 790 * 4, sku: "PRD-LRL-01" },
  { id: "33333333-3333-3333-3333-333333330102", category_id: "22222222-2222-2222-2222-222222222207", name: "L'Oréal xtansho Blue - Shampoo", cost_price: 690, price: 690 * 4, sku: "PRD-LRL-02" },
  { id: "33333333-3333-3333-3333-333333330103", category_id: "22222222-2222-2222-2222-222222222207", name: "L'Oréal xtansho Blue - Mask", cost_price: 850, price: 850 * 4, sku: "PRD-LRL-03" },
  { id: "33333333-3333-3333-3333-333333330104", category_id: "22222222-2222-2222-2222-222222222207", name: "L'Oréal xtansho Gold - Shampoo", cost_price: 1120, price: 1120 * 4, sku: "PRD-LRL-04" },
  { id: "33333333-3333-3333-3333-333333330105", category_id: "22222222-2222-2222-2222-222222222207", name: "L'Oréal xtansho Gold - Mask", cost_price: 1290, price: 1290 * 4, sku: "PRD-LRL-05" },
  { id: "33333333-3333-3333-3333-333333330106", category_id: "22222222-2222-2222-2222-222222222207", name: "Krone - Shampoo", cost_price: 850, price: 850 * 4, sku: "PRD-KRN-01" },
  { id: "33333333-3333-3333-3333-333333330107", category_id: "22222222-2222-2222-2222-222222222207", name: "Krone - Mask", cost_price: 600, price: 600 * 4, sku: "PRD-KRN-02" },
  { id: "33333333-3333-3333-3333-333333330108", category_id: "22222222-2222-2222-2222-222222222207", name: "Godrej - Serum", cost_price: 299, price: 299 * 4, sku: "PRD-GDJ-01" },
  { id: "33333333-3333-3333-3333-333333330109", category_id: "22222222-2222-2222-2222-222222222207", name: "Godrej - Keracare Shampoo", cost_price: 1200, price: 1200 * 4, sku: "PRD-GDJ-02" },
  { id: "33333333-3333-3333-3333-333333330110", category_id: "22222222-2222-2222-2222-222222222207", name: "Godrej - Keracare Conditioner", cost_price: 1200, price: 1200 * 4, sku: "PRD-GDJ-03" },
  { id: "33333333-3333-3333-3333-333333330111", category_id: "22222222-2222-2222-2222-222222222207", name: "72 - Shampoo", cost_price: 1395, price: 1395 * 4, sku: "PRD-72-01" },
  { id: "33333333-3333-3333-3333-333333330112", category_id: "22222222-2222-2222-2222-222222222207", name: "72 - Mask", cost_price: 1695, price: 1695 * 4, sku: "PRD-72-02" },
  { id: "33333333-3333-3333-3333-333333330113", category_id: "22222222-2222-2222-2222-222222222207", name: "72 - Serum", cost_price: 1195, price: 1195 * 4, sku: "PRD-72-03" },
  { id: "33333333-3333-3333-3333-333333330114", category_id: "22222222-2222-2222-2222-222222222207", name: "72 - Conditioner", cost_price: 1395, price: 1395 * 4, sku: "PRD-72-04" },
  { id: "33333333-3333-3333-3333-333333330115", category_id: "22222222-2222-2222-2222-222222222207", name: "Pro Viva Smooth - Shampoo", cost_price: 1150, price: 1150 * 4, sku: "PRD-PV-01" },
  { id: "33333333-3333-3333-3333-333333330116", category_id: "22222222-2222-2222-2222-222222222207", name: "Pro Viva Smooth - Conditioner", cost_price: 1200, price: 1200 * 4, sku: "PRD-PV-02" },
  { id: "33333333-3333-3333-3333-333333330117", category_id: "22222222-2222-2222-2222-222222222207", name: "Pro Viva Hydration - Shampoo", cost_price: 1150, price: 1150 * 4, sku: "PRD-PV-03" },
  { id: "33333333-3333-3333-3333-333333330118", category_id: "22222222-2222-2222-2222-222222222207", name: "Pro Viva Hydration - Conditioner", cost_price: 1200, price: 1200 * 4, sku: "PRD-PV-04" },
  { id: "33333333-3333-3333-3333-333333330119", category_id: "22222222-2222-2222-2222-222222222207", name: "Pro Viva Repair - Shampoo", cost_price: 1150, price: 1150 * 4, sku: "PRD-PV-05" },
  { id: "33333333-3333-3333-3333-333333330120", category_id: "22222222-2222-2222-2222-222222222207", name: "Pro Viva Repair - Conditioner", cost_price: 1200, price: 1200 * 4, sku: "PRD-PV-06" },
  { id: "33333333-3333-3333-3333-333333330121", category_id: "22222222-2222-2222-2222-222222222207", name: "Loreal KAS - Shampoo", cost_price: 990, price: 990 * 4, sku: "PRD-KAS-01" },
  { id: "33333333-3333-3333-3333-333333330122", category_id: "22222222-2222-2222-2222-222222222207", name: "Loreal KAS - Mask", cost_price: 1290, price: 1290 * 4, sku: "PRD-KAS-02" },
  { id: "33333333-3333-3333-3333-333333330123", category_id: "22222222-2222-2222-2222-222222222207", name: "Loreal KAS - Transform Creame", cost_price: 1800, price: 1800 * 4, sku: "PRD-KAS-03" },

  // Skincare Products (Category 22222222-2222-2222-2222-222222222208)
  { id: "33333333-3333-3333-3333-333333330124", category_id: "22222222-2222-2222-2222-222222222208", name: "ABC - Serum", cost_price: 1799, price: 1799 * 4, sku: "PRD-ABC-01" },
  { id: "33333333-3333-3333-3333-333333330125", category_id: "22222222-2222-2222-2222-222222222208", name: "C-10 - Serum", cost_price: 1199, price: 1199 * 4, sku: "PRD-C10-01" },
  { id: "33333333-3333-3333-3333-333333330126", category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Face Oil - Oil", cost_price: 1903, price: 1903 * 4, sku: "PRD-OZN-01" },
  { id: "33333333-3333-3333-3333-333333330127", category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Complexion Brightening - Facewash", cost_price: 290, price: 290 * 4, sku: "PRD-OZN-02" },
  { id: "33333333-3333-3333-3333-333333330128", category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Complexion Brightening - Cream", cost_price: 350, price: 350 * 4, sku: "PRD-OZN-03" },
  { id: "33333333-3333-3333-3333-333333330129", category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Perfect Skin Tone - Facewash", cost_price: 290, price: 290 * 4, sku: "PRD-OZN-04" },
  { id: "33333333-3333-3333-3333-333333330130", category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Perfect Skin Tone - Cream", cost_price: 350, price: 350 * 4, sku: "PRD-OZN-05" },
  { id: "33333333-3333-3333-3333-333333330131", category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Youth Restoring - Facewash", cost_price: 290, price: 290 * 4, sku: "PRD-OZN-06" },
  { id: "33333333-3333-3333-3333-333333330132", category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Youth Restoring - Cream", cost_price: 350, price: 350 * 4, sku: "PRD-OZN-07" },
  { id: "33333333-3333-3333-3333-333333330133", category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Acne Check - Facewash", cost_price: 290, price: 290 * 4, sku: "PRD-OZN-08" },
  { id: "33333333-3333-3333-3333-333333330134", category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Acne Check - Cream", cost_price: 350, price: 350 * 4, sku: "PRD-OZN-09" },
  { id: "33333333-3333-3333-3333-333333330135", category_id: "22222222-2222-2222-2222-222222222208", name: "Kanpeki - Balancing Cleanser", cost_price: 960, price: 960 * 4, sku: "PRD-KNP-01" },
  { id: "33333333-3333-3333-3333-333333330136", category_id: "22222222-2222-2222-2222-222222222208", name: "Kanpeki - Facial Wash", cost_price: 960, price: 960 * 4, sku: "PRD-KNP-02" },
];

async function update4x() {
  console.log("Updating 36 products in Supabase with 4x sale price and cost price...");

  const items = PRODUCTS_4X.map((p) => ({
    id: p.id,
    category_id: p.category_id,
    name: p.name,
    type: "product",
    cost_price: p.cost_price,
    price: p.price,
    sku: p.sku,
    stock_qty: 25,
    is_active: true,
  }));

  const { data, error } = await supabase.from("catalog_items").upsert(items).select();
  if (error) {
    console.error("Error upserting 4x products:", error);
  } else {
    console.log(`Successfully updated ${data.length} products with 4x pricing & cost price tracking!`);
  }
}

update4x();
