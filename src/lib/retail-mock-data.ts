/**
 * Preview-only data for Stage 9 (Retail & Financial Operations) frontend.
 *
 * NOT wired to Supabase yet — see docs/stage-9-retail-financial-operations-plan.md.
 * Types here mirror the planned schema so swapping this module out for real
 * Supabase queries later is a drop-in replacement, not a redesign.
 */

export type ProductCategory = "Melukis" | "Menghias" | "Meronce";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  unit: string;
  status: "active" | "inactive";
}

export interface ExpenseItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  default_price: number | null;
  status: "active" | "inactive";
}

export interface SalesTransaction {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  transaction_date: string; // "YYYY-MM-DD"
  notes: string | null;
}

export interface ExpenseTransaction {
  id: string;
  expense_item_id: string;
  quantity: number;
  unit_price: number;
  transaction_date: string;
  notes: string | null;
}

export const MOCK_PRODUCTS: Product[] = [
  { id: "p1", name: "Melukis Kanvas Polos", category: "Melukis", price: 29000, unit: "paket", status: "active" },
  { id: "p2", name: "Melukis Kanvas Angka", category: "Melukis", price: 54000, unit: "paket", status: "active" },
  { id: "p3", name: "Melukis Kanvas Pola", category: "Melukis", price: 34000, unit: "paket", status: "active" },
  { id: "p4", name: "Melukis Bucket-Hat", category: "Melukis", price: 39000, unit: "paket", status: "active" },
  { id: "p5", name: "Melukis Tote-Bag", category: "Melukis", price: 24000, unit: "paket", status: "active" },
  { id: "p6", name: "Melukis Pouch", category: "Melukis", price: 24000, unit: "paket", status: "active" },
  { id: "p7", name: "Melukis Cermin", category: "Melukis", price: 39000, unit: "paket", status: "active" },
  { id: "p8", name: "Melukis Beruang", category: "Melukis", price: 34000, unit: "paket", status: "active" },
  { id: "p9", name: "Melukis Akrilik", category: "Melukis", price: 34000, unit: "paket", status: "active" },
  { id: "p10", name: "Melukis Patung", category: "Melukis", price: 19000, unit: "paket", status: "active" },
  { id: "p11", name: "Melukis Pot Tanah Liat", category: "Melukis", price: 39000, unit: "paket", status: "active" },
  { id: "p12", name: "Melukis Pot Gypsum", category: "Melukis", price: 39000, unit: "paket", status: "active" },
  { id: "p13", name: "Melukis Kipas Pola", category: "Melukis", price: 19000, unit: "paket", status: "active" },
  { id: "p14", name: "Melukis Coaster", category: "Melukis", price: 29000, unit: "paket", status: "active" },
  { id: "p15", name: "Menghias Cermin", category: "Menghias", price: 29000, unit: "paket", status: "active" },
  { id: "p16", name: "Meronce Manik-manik", category: "Meronce", price: 29000, unit: "paket", status: "active" },
];

export const MOCK_EXPENSE_ITEMS: ExpenseItem[] = [
  { id: "e1", name: "Kanvas 20x20", category: "Bahan Melukis", unit: "pcs", default_price: 15000, status: "active" },
  { id: "e2", name: "Kanvas Angka", category: "Bahan Melukis", unit: "pcs", default_price: 35000, status: "active" },
  { id: "e3", name: "Kanvas Pola", category: "Bahan Melukis", unit: "pcs", default_price: 20000, status: "active" },
  { id: "e4", name: "Bucket-Hat", category: "Bahan Melukis", unit: "pcs", default_price: 20000, status: "active" },
  { id: "e5", name: "Tote Bag", category: "Bahan Melukis", unit: "pcs", default_price: 10000, status: "active" },
  { id: "e6", name: "Pouch", category: "Bahan Melukis", unit: "pcs", default_price: 10000, status: "active" },
  { id: "e7", name: "Cermin Hexagon", category: "Bahan Melukis", unit: "pcs", default_price: 20000, status: "active" },
  { id: "e8", name: "Ganci Beruang", category: "Bahan Melukis", unit: "pcs", default_price: 15000, status: "active" },
  { id: "e9", name: "Ganci Akrilik", category: "Bahan Melukis", unit: "pcs", default_price: 15000, status: "active" },
  { id: "e10", name: "Patung Gypsum", category: "Bahan Melukis", unit: "pcs", default_price: 8000, status: "active" },
  { id: "e11", name: "Pot Tanah Liat", category: "Bahan Melukis", unit: "pcs", default_price: 20000, status: "active" },
  { id: "e12", name: "Pot Gypsum", category: "Bahan Melukis", unit: "pcs", default_price: 20000, status: "active" },
  { id: "e13", name: "Kipas Pola", category: "Bahan Melukis", unit: "pcs", default_price: 8000, status: "active" },
  { id: "e14", name: "Coaster Gypsum", category: "Bahan Melukis", unit: "pcs", default_price: 12000, status: "active" },
  { id: "e15", name: "Cermin Kotak", category: "Bahan Menghias", unit: "pcs", default_price: 15000, status: "active" },
  { id: "e16", name: "Manik-manik", category: "Bahan Meronce", unit: "set", default_price: 12000, status: "active" },
  { id: "e17", name: "Cat 12 Warna", category: "Bahan Habis Pakai", unit: "set", default_price: 25000, status: "active" },
  { id: "e18", name: "Kuas", category: "Bahan Habis Pakai", unit: "pcs", default_price: 3000, status: "active" },
  { id: "e19", name: "Piring Palette", category: "Bahan Habis Pakai", unit: "pcs", default_price: 2000, status: "active" },
  { id: "e20", name: "Benang", category: "Bahan Meronce", unit: "gulung", default_price: 5000, status: "active" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export const MOCK_SALES_TRANSACTIONS: SalesTransaction[] = [
  { id: "s1", product_id: "p1", quantity: 3, unit_price: 29000, transaction_date: today(), notes: null },
  { id: "s2", product_id: "p4", quantity: 2, unit_price: 39000, transaction_date: today(), notes: null },
  { id: "s3", product_id: "p16", quantity: 5, unit_price: 29000, transaction_date: today(), notes: "Rombongan sekolah" },
  { id: "s4", product_id: "p2", quantity: 1, unit_price: 54000, transaction_date: today(), notes: null },
];

export const MOCK_EXPENSE_TRANSACTIONS: ExpenseTransaction[] = [
  { id: "x1", expense_item_id: "e17", quantity: 10, unit_price: 25000, transaction_date: today(), notes: "Restock cat" },
  { id: "x2", expense_item_id: "e1", quantity: 20, unit_price: 15000, transaction_date: today(), notes: null },
  { id: "x3", expense_item_id: "e18", quantity: 15, unit_price: 3000, transaction_date: today(), notes: null },
];
