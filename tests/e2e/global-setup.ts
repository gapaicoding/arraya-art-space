import { cleanupTestData, seedTestUsers } from "./supabase-admin";

export default async function globalSetup() {
  // Clean any leftovers from a previous failed run first, then seed fresh test users.
  await cleanupTestData();
  await seedTestUsers();
}
