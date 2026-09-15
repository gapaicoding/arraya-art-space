/**
 * Detects overlapping schedules in the same area — should never happen
 * thanks to the DB exclusion constraint (see supabase/migrations/0001_init.sql),
 * but is computed here as a defensive, visible sanity check across the app.
 */
export type ConflictCheckSchedule = {
  id: string;
  area_id: string;
  start_at: string;
  end_at: string;
};

export function computeScheduleConflicts<T extends ConflictCheckSchedule>(
  schedules: T[],
): { a: T; b: T }[] {
  const conflicts: { a: T; b: T }[] = [];
  const byArea = new Map<string, T[]>();
  for (const s of schedules) {
    const list = byArea.get(s.area_id) ?? [];
    list.push(s);
    byArea.set(s.area_id, list);
  }
  for (const list of byArea.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!;
        const b = list[j]!;
        if (new Date(a.start_at) < new Date(b.end_at) && new Date(b.start_at) < new Date(a.end_at)) {
          conflicts.push({ a, b });
        }
      }
    }
  }
  return conflicts;
}
