import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { ProductsClient } from "./products-client";

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });
  if (error) logError("products-page-fetch", error);

  return <ProductsClient initialProducts={products ?? []} />;
}
