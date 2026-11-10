import type { TriggerDefinition } from "@w6w/types";
import { pollWindow, toMs } from "../lib/window.ts";
import action from "../actions/lead-list.ts";

/** Look-back before the previous check. The vendor filter is a whole day, so the day before is requested and `clientSince` trims the rest. */
export const OVERLAP_MS = 120_000;
const DAY_MS = 86_400_000;
/** Pages read per check; a longer window is resumed on the next check (brief 9.8). */
export const MAX_PAGES = 10;
const PAGE_SIZE = 100;
/** The lead's creation time; the vendor field name is read leniently and an unparseable one keeps the lead. */
export function leadCreatedAt(item: unknown): number | undefined {
  const lead = item as Record<string, unknown>;
  return toMs(lead.createDate ?? lead.createdAt ?? lead.created_at ?? lead.dateCreated);
}
export const clock = { now: (): number => Date.now() };

const trigger: TriggerDefinition = {
  key: "new-lead",
  title: "New Lead",
  description: "Emits leads created since the previous successful check.",
  params: [],
  output: [{ key: "id", type: "number", label: "Lead ID" }],
  sample: { id: 101 },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return await pollWindow<unknown, number>({
      state,
      now: clock.now(),
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      // Covers a day of leads re-served whole when the stamp carries no time (cannot be trimmed).
      seenWindow: 2000,
      clientSince: true,
      idOf: (item) => String((item as { id?: unknown }).id ?? ""),
      tsOf: leadCreatedAt,
      async load(since, pos) {
        const page = pos ?? 1;
        const startDate = new Date(since - DAY_MS).toISOString().slice(0, 10);
        const result = await action.execute({ startDate, page, pageSize: PAGE_SIZE }, ctx) as {
          leads?: unknown[];
          totalCount?: number;
        };
        const leads = result.leads ?? [];
        const more = leads.length >= PAGE_SIZE && page * PAGE_SIZE < Number(result.totalCount ?? 0);
        return { items: leads, next: more ? page + 1 : undefined };
      },
    });
  },
};

export default trigger;
