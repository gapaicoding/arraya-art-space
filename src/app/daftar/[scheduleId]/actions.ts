"use server";

import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { isValidIndonesianPhone } from "@/lib/phone";

type ActionResult = { error?: string; success?: boolean };

export async function registerForEventAction(
  scheduleId: string,
  formData: FormData,
): Promise<ActionResult> {
  // Honeypot: real visitors never see or fill this field (hidden via
  // CSS), so a filled value means a bot filled every field it found.
  // Fail silently — don't tell the bot why, just pretend it worked.
  if (formData.get("website")) {
    return { success: true };
  }

  const customerName = String(formData.get("customer_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const participantCountRaw = String(formData.get("participant_count") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!customerName) {
    return { error: "Nama wajib diisi." };
  }
  if (customerName.length > 200) {
    return { error: "Nama maksimal 200 karakter." };
  }
  if (!isValidIndonesianPhone(phone)) {
    return { error: "Nomor HP tidak valid. Gunakan format 08xxx atau +62xxx." };
  }
  const participantCount = Number(participantCountRaw);
  if (!Number.isInteger(participantCount) || participantCount <= 0) {
    return { error: "Jumlah peserta harus lebih dari 0." };
  }
  if (notes.length > 500) {
    return { error: "Catatan maksimal 500 karakter." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("event_registrations").insert({
    schedule_id: scheduleId,
    customer_name: customerName,
    phone,
    participant_count: participantCount,
    notes: notes || null,
  });
  if (error) {
    logError("event-registration-insert", error);
    return { error: "Gagal mengirim pendaftaran. Silakan coba lagi." };
  }

  return { success: true };
}
