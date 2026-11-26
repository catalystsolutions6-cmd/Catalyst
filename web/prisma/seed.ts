/* Demo data: categories, a few Hafeez Center / Hall Road shops and sample products.
   Run: npm run db:seed  (safe to re-run; it wipes and recreates demo data) */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { mkdirSync, writeFileSync } from "fs";

const db = new PrismaClient();

const categories = [
  ["laptops", "Laptops"],
  ["desktops", "Desktops & PCs"],
  ["monitors-lcds", "Monitors & LCDs"],
  ["headphones", "Headphones & Audio"],
  ["accessories", "Accessories"],
  ["gaming", "Gaming"],
  ["storage", "Storage & Memory"],
  ["networking", "Networking"],
  ["mobiles-tablets", "Mobiles & Tablets"],
] as const;

const shops = [
  { name: "Al-Rehman Computers", market: "Hafeez Center", shopNumber: "Shop 14, Ground Floor", ownerName: "Abdul Rehman", phone: "03001234567" },
  { name: "Tech Zone", market: "Hafeez Center", shopNumber: "Shop 210, 2nd Floor", ownerName: "Usman Ali", phone: "03011234567" },
  { name: "Madina Electronics", market: "Hall Road", shopNumber: "Shop 7, Sharif Plaza", ownerName: "Imran Sheikh", phone: "03021234567" },
  { name: "Lahore Laptop House", market: "Hafeez Center", shopNumber: "Shop 32, 1st Floor", ownerName: "Bilal Ahmed", phone: "03031234567" },
  { name: "Star Audio", market: "Hall Road", shopNumber: "Shop 19, Rex Center", ownerName: "Kashif Mehmood", phone: "03041234567" },
];

// [title, category, brand, model, condition, price, comparePrice, stock, shopIndex, specs, colour]
type Row = [string, string, string, string, string, number, number | null, number, number, Record<string, string>, string];
const products: Row[] = [
  ["HP EliteBook 840 G8 Core i5 11th Gen 16GB 512GB SSD", "laptops", "HP", "EliteBook 840 G8", "used", 112000, 135000, 6, 0, { Processor: "Intel Core i5-1135G7", RAM: "16GB DDR4", Storage: "512GB NVMe SSD", Display: '14" FHD IPS', Condition: "10/10 imported" }, "#1d4ed8"],
  ["Dell Latitude 5420 Core i7 11th Gen 16GB 256GB", "laptops", "Dell", "Latitude 5420", "used", 118500, 140000, 4, 3, { Processor: "Intel Core i7-1185G7", RAM: "16GB", Storage: "256GB SSD", Display: '14" FHD' }, "#0f172a"],
  ["Lenovo ThinkPad T14 Gen 2 Ryzen 5 Pro", "laptops", "Lenovo", "ThinkPad T14 Gen 2", "refurbished", 104000, null, 3, 3, { Processor: "AMD Ryzen 5 PRO 5650U", RAM: "16GB", Storage: "512GB SSD", Display: '14" FHD Touch' }, "#111827"],
  ["Apple MacBook Air M2 13.6\" 8GB 256GB Midnight", "laptops", "Apple", "MacBook Air M2", "new", 289000, 315000, 2, 1, { Chip: "Apple M2 8-core", RAM: "8GB", Storage: "256GB SSD", Display: '13.6" Liquid Retina', Warranty: "1 year" }, "#334155"],
  ["ASUS TUF Gaming F15 Core i5 12th Gen RTX 3050", "laptops", "ASUS", "TUF F15 FX507ZC", "new", 229000, 249000, 5, 1, { Processor: "Intel Core i5-12500H", GPU: "RTX 3050 4GB", RAM: "16GB", Storage: "512GB SSD", Display: '15.6" 144Hz' }, "#b45309"],
  ["Dell OptiPlex 7060 Core i7 8th Gen Mini Tower", "desktops", "Dell", "OptiPlex 7060", "used", 62000, 70000, 10, 0, { Processor: "Core i7-8700", RAM: "16GB", Storage: "256GB SSD + 500GB HDD", "Form factor": "Mini tower" }, "#0f766e"],
  ["Custom Gaming PC Ryzen 5 5600 RTX 4060 16GB", "desktops", "Custom", "Ryzen 5600 / RTX 4060", "new", 245000, null, 3, 1, { CPU: "Ryzen 5 5600", GPU: "RTX 4060 8GB", RAM: "16GB 3200MHz", Storage: "1TB NVMe", PSU: "650W Bronze" }, "#7c3aed"],
  ["HP ProDesk 600 G4 SFF Core i5 8th Gen", "desktops", "HP", "ProDesk 600 G4", "used", 41500, 48000, 12, 2, { Processor: "Core i5-8500", RAM: "8GB", Storage: "256GB SSD" }, "#155e75"],
  ["Samsung 24\" Curved LED Monitor 75Hz C24F390", "monitors-lcds", "Samsung", "C24F390", "new", 34500, 39000, 8, 2, { Size: '24"', Panel: "VA Curved 1800R", Resolution: "1920x1080", "Refresh rate": "75Hz" }, "#1e3a8a"],
  ["Dell P2419H 24\" IPS Monitor (Box Open)", "monitors-lcds", "Dell", "P2419H", "used", 27000, 33000, 15, 0, { Size: '24"', Panel: "IPS", Resolution: "1920x1080", Ports: "HDMI, DP, VGA, USB" }, "#1f2937"],
  ["LG 27\" UltraGear 165Hz Gaming Monitor 27GN800", "monitors-lcds", "LG", "27GN800-B", "new", 74000, 82000, 4, 2, { Size: '27"', Resolution: "2560x1440", "Refresh rate": "144Hz (165Hz OC)", Panel: "IPS 1ms" }, "#be123c"],
  ["Sony WH-1000XM5 Wireless Noise Cancelling", "headphones", "Sony", "WH-1000XM5", "new", 89000, 99000, 3, 4, { Type: "Over-ear", Connectivity: "Bluetooth 5.2", Battery: "30 hours", ANC: "Yes" }, "#0f172a"],
  ["JBL Tune 520BT Wireless On-Ear Headphones", "headphones", "JBL", "Tune 520BT", "new", 11500, 13500, 20, 4, { Type: "On-ear", Battery: "57 hours", Connectivity: "Bluetooth 5.3" }, "#2563eb"],
  ["Apple AirPods Pro 2nd Gen USB-C", "headphones", "Apple", "AirPods Pro 2", "new", 62000, 68000, 6, 4, { Type: "In-ear TWS", ANC: "Yes", Case: "MagSafe USB-C" }, "#475569"],
  ["Logitech G502 HERO Gaming Mouse", "accessories", "Logitech", "G502 HERO", "new", 9800, 11500, 25, 1, { Sensor: "HERO 25K", DPI: "100-25,600", Buttons: "11 programmable" }, "#0e7490"],
  ["Redragon K552 Kumara RGB Mechanical Keyboard", "accessories", "Redragon", "K552", "new", 7200, 8500, 30, 2, { Switches: "Outemu Blue", Layout: "TKL 87 keys", Lighting: "RGB" }, "#dc2626"],
  ["Anker 65W USB-C GaN Laptop Charger", "accessories", "Anker", "715 Nano II", "new", 8900, null, 18, 0, { Output: "65W PD", Ports: "1x USB-C", Tech: "GaN II" }, "#0369a1"],
  ["Sony PlayStation 5 Slim Disc Edition", "gaming", "Sony", "PS5 Slim", "new", 158000, 170000, 2, 1, { Storage: "1TB", Edition: "Disc", Warranty: "Shop warranty 6 months" }, "#1e40af"],
  ["Xbox Wireless Controller Carbon Black", "gaming", "Microsoft", "Xbox Controller", "new", 16500, 18500, 9, 1, { Connectivity: "Bluetooth / USB-C", Compatible: "Xbox, PC, Android" }, "#166534"],
  ["Samsung 980 1TB NVMe M.2 SSD", "storage", "Samsung", "980", "new", 21500, 24000, 14, 0, { Capacity: "1TB", Interface: "PCIe 3.0 x4 NVMe", Read: "3500 MB/s" }, "#4338ca"],
  ["Kingston 16GB DDR4 3200MHz Laptop RAM", "storage", "Kingston", "KVR32S22S8/16", "new", 9500, null, 40, 3, { Capacity: "16GB", Type: "DDR4 SO-DIMM", Speed: "3200MHz" }, "#065f46"],
  ["TP-Link Archer C6 AC1200 Dual Band Router", "networking", "TP-Link", "Archer C6", "new", 8900, 10500, 22, 2, { Speed: "AC1200", Bands: "2.4GHz + 5GHz", Antennas: "4 external" }, "#0f766e"],
  ["Samsung Galaxy Tab A9+ 11\" 8GB 128GB", "mobiles-tablets", "Samsung", "Galaxy Tab A9+", "new", 72000, 79000, 5, 1, { Display: '11" 90Hz', RAM: "8GB", Storage: "128GB", "PTA approved": "Yes" }, "#6d28d9"],
  ["Apple iPad 10th Gen 64GB Wi-Fi", "mobiles-tablets", "Apple", "iPad 10", "new", 118000, 129000, 3, 3, { Display: '10.9" Liquid Retina', Chip: "A14 Bionic", Storage: "64GB" }, "#0284c7"],
];

const icons: Record<string, string> = {
  laptops: `<rect x="110" y="110" width="380" height="240" rx="14" fill="#0b1220"/><rect x="126" y="126" width="348" height="208" rx="6" fill="url(#s)"/><path d="M70 360h460l-30 36H100z" fill="#cbd5e1"/><rect x="260" y="362" width="80" height="8" rx="4" fill="#94a3b8"/>`,
  desktops: `<rect x="80" y="110" width="300" height="200" rx="12" fill="#0b1220"/><rect x="94" y="124" width="272" height="172" rx="4" fill="url(#s)"/><rect x="205" y="310" width="50" height="50" fill="#94a3b8"/><rect x="160" y="356" width="140" height="14" rx="7" fill="#cbd5e1"/><rect x="410" y="110" width="110" height="260" rx="12" fill="#0b1220"/><circle cx="465" cy="150" r="10" fill="#38bdf8"/><rect x="430" y="190" width="70" height="6" rx="3" fill="#334155"/><rect x="430" y="206" width="70" height="6" rx="3" fill="#334155"/>`,
  "monitors-lcds": `<rect x="90" y="90" width="420" height="250" rx="14" fill="#0b1220"/><rect x="104" y="104" width="392" height="222" rx="6" fill="url(#s)"/><path d="M270 340h60l14 50h-88z" fill="#94a3b8"/><rect x="210" y="386" width="180" height="14" rx="7" fill="#cbd5e1"/>`,
  headphones: `<path d="M170 300v-60a130 130 0 0 1 260 0v60" fill="none" stroke="#0b1220" stroke-width="26" stroke-linecap="round"/><rect x="130" y="270" width="90" height="140" rx="40" fill="#0b1220"/><rect x="380" y="270" width="90" height="140" rx="40" fill="#0b1220"/><rect x="150" y="295" width="50" height="90" rx="24" fill="url(#s)"/><rect x="400" y="295" width="50" height="90" rx="24" fill="url(#s)"/>`,
  accessories: `<rect x="70" y="250" width="320" height="120" rx="14" fill="#0b1220"/>${Array.from({ length: 24 }, (_, i) => `<rect x="${86 + (i % 8) * 37}" y="${266 + Math.floor(i / 8) * 32}" width="30" height="24" rx="4" fill="#334155"/>`).join("")}<rect x="420" y="190" width="110" height="180" rx="55" fill="#0b1220"/><rect x="471" y="210" width="8" height="40" rx="4" fill="url(#s)"/>`,
  gaming: `<path d="M160 220h280c50 0 80 60 90 130s-40 80-70 40l-40-50H180l-40 50c-30 40-80 30-70-40s40-130 90-130z" fill="#0b1220"/><rect x="185" y="270" width="60" height="18" rx="4" fill="#e2e8f0"/><rect x="206" y="249" width="18" height="60" rx="4" fill="#e2e8f0"/><circle cx="400" cy="262" r="12" fill="#f59e0b"/><circle cx="430" cy="290" r="12" fill="#38bdf8"/><circle cx="370" cy="290" r="12" fill="#f43f5e"/><circle cx="400" cy="318" r="12" fill="#22c55e"/>`,
  storage: `<rect x="110" y="200" width="380" height="110" rx="10" fill="#0b1220"/><rect x="130" y="222" width="150" height="66" rx="6" fill="url(#s)"/><rect x="300" y="222" width="50" height="66" rx="4" fill="#334155"/><rect x="365" y="222" width="50" height="66" rx="4" fill="#334155"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${440 + (i % 2) * 18}" y="${222 + Math.floor(i / 2) * 17}" width="12" height="10" fill="#fbbf24"/>`).join("")}`,
  networking: `<rect x="110" y="270" width="380" height="100" rx="20" fill="#0b1220"/>${[150, 250, 350, 450].map((x) => `<rect x="${x - 7}" y="150" width="14" height="130" rx="7" fill="#0b1220"/>`).join("")}${[180, 220, 260, 300].map((x) => `<circle cx="${x}" cy="320" r="7" fill="#22c55e"/>`).join("")}`,
  "mobiles-tablets": `<rect x="150" y="80" width="300" height="360" rx="28" fill="#0b1220"/><rect x="166" y="100" width="268" height="320" rx="14" fill="url(#s)"/>`,
};

function svg(category: string, color: string, label: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8fafc"/><stop offset="1" stop-color="#e2e8f0"/></linearGradient><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs><rect width="600" height="600" fill="url(#b)"/><circle cx="300" cy="270" r="230" fill="${color}" opacity=".08"/>${icons[category]}<text x="300" y="500" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="30" font-weight="700" fill="#0f172a">${label}</text></svg>`;
}

async function main() {
  await db.session.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.product.deleteMany();
  await db.shop.deleteMany();
  await db.category.deleteMany();

  for (const [i, [slug, name]] of categories.entries()) await db.category.create({ data: { slug, name, sortOrder: i } });

  const hash = await bcrypt.hash("shop1234", 10);
  const shopIds: string[] = [];
  for (const s of shops) {
    const shop = await db.shop.create({
      data: { ...s, slug: s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), passwordHash: hash },
    });
    shopIds.push(shop.id);
  }

  mkdirSync("public/seed", { recursive: true });
  for (const [i, [title, cat, brandName, model, condition, price, compare, stock, shopIdx, specs, color]] of products.entries()) {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) + `-${i + 1}`;
    writeFileSync(`public/seed/${slug}.svg`, svg(cat, color, `${brandName} ${model}`.replace(/&/g, "&amp;").replace(/"/g, "&quot;")));
    await db.product.create({
      data: {
        slug,
        title,
        description: `${title}. Sourced from a verified Lahore tech market shop and checked before dispatch. ${condition === "new" ? "Brand new, box packed." : condition === "used" ? "Imported used unit in excellent condition, fully tested." : "Professionally refurbished and tested."} Cash on delivery available across Pakistan.`,
        categorySlug: cat,
        brand: brandName,
        model,
        condition,
        specs: JSON.stringify(specs),
        images: JSON.stringify([`/seed/${slug}.svg`]),
        price,
        comparePrice: compare,
        stock,
        shopId: shopIds[shopIdx],
        createdAt: new Date(Date.now() - i * 3600_000),
      },
    });
  }
  console.log(`Seeded ${categories.length} categories, ${shops.length} shops, ${products.length} products.`);
  console.log(`Shopkeeper app demo login: phone 03001234567, password shop1234`);
}

main().finally(() => db.$disconnect());
