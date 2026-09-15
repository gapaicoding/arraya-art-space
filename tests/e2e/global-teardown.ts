import { cleanupTestData } from "./supabase-admin";

export default async function globalTeardown() {
  await cleanupTestData();
}
