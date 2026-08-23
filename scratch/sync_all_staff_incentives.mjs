import { createClient } from "@supabase/supabase-js";

const url = "https://uxyljbjebtsdwpesjwzy.supabase.co";
const key = "sb_publishable_NGCQEYXXwk7gUo6G3GOtAg_CBRSTZgV";

const supabase = createClient(url, key);

async function testSync() {
  const staff = [
    {
      id: "11111111-1111-1111-1111-111111111101",
      name: "Aamir",
      role: "Senior Stylist",
      phone: null,
      commission_rate: 15,
      commission_type: "percent",
      product_commission_rate: 10,
      product_commission_type: "percent",
      status: "active",
      color: "#6366f1",
      notes: "Senior Stylist",
    },
    {
      id: "11111111-1111-1111-1111-111111111102",
      name: "Subhaan",
      role: "Stylist",
      phone: null,
      commission_rate: 15,
      commission_type: "percent",
      product_commission_rate: 10,
      product_commission_type: "percent",
      status: "active",
      color: "#ec4899",
      notes: "Stylist",
    },
    {
      id: "11111111-1111-1111-1111-111111111103",
      name: "Arbaaz",
      role: "Stylist",
      phone: null,
      commission_rate: 15,
      commission_type: "percent",
      product_commission_rate: 10,
      product_commission_type: "percent",
      status: "active",
      color: "#06b6d4",
      notes: "Stylist",
    },
    {
      id: "11111111-1111-1111-1111-111111111104",
      name: "Mahi",
      role: "Beautician Stylist",
      phone: null,
      commission_rate: 15,
      commission_type: "percent",
      product_commission_rate: 10,
      product_commission_type: "percent",
      status: "active",
      color: "#10b981",
      notes: "Beautician Stylist",
    },
    {
      id: "11111111-1111-1111-1111-111111111105",
      name: "Sitara",
      role: "Beautician Stylist",
      phone: null,
      commission_rate: 15,
      commission_type: "percent",
      product_commission_rate: 10,
      product_commission_type: "percent",
      status: "active",
      color: "#f59e0b",
      notes: "Beautician Stylist",
    }
  ];

  for (const s of staff) {
    const incentiveMeta = {
      commission_type: s.commission_type,
      product_commission_rate: s.product_commission_rate,
      product_commission_type: s.product_commission_type,
      custom_notes: s.notes,
    };

    const payload = {
      id: s.id,
      name: s.name,
      phone: s.phone,
      role: s.role,
      commission_rate: s.commission_rate,
      status: s.status,
      color: s.color,
      notes: JSON.stringify(incentiveMeta),
    };

    const { error } = await supabase.from("staff").upsert(payload);
    if (error) console.error("Error upserting:", s.name, error);
    else console.log("Successfully synced staff member:", s.name);
  }
}

testSync();
