import type { OutputField, TriggerDefinition } from "@w6w/types";
import contactsList from "../actions/contacts-list.ts";
import companiesList from "../actions/companies-list.ts";
import { clock } from "./triggers.ts";
import { pollWindow, toMs } from "./window.ts";

const PER_PAGE = 100;
/** Look-back before the previous check, so a record saved late is still seen. */
const OVERLAP_MS = 120_000;
/** Per-check ceiling: 3 pages of 100; a longer window is resumed on the next check (brief 9.8). */
const MAX_PAGES = 3;
const SEEN_WINDOW = MAX_PAGES * PER_PAGE + PER_PAGE;

interface Row {
  researchedAt?: string;
  createdAt?: string;
}

/**
 * Since-filter poll (brief 9.1 b) over `GET /contacts` / `GET /companies`, the org's researched
 * records. The vendor documents one required lookback window (`startDate`..`endDate`, ISO 8601)
 * for incremental export (https://docs.seamless.ai/api-catalog/my-contact-data) but not which
 * timestamp it filters, so each check asks for `cursor - overlap`..window start, pages through it,
 * and dedupes by id. The floor (brief 9.9) compares `researchedAt` (when the record entered the
 * org), falling back to `createdAt`; a record with neither is kept.
 */
export function orgWindowTrigger(o: {
  key: string;
  title: string;
  description: string;
  action: typeof contactsList | typeof companiesList;
  idField: "contactId" | "companyId";
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: o.key,
    title: o.title,
    description: o.description,
    output: o.output,
    sample: o.sample,
    minIntervalMs: 300_000,
    poll({ state }, ctx) {
      return pollWindow<Row & Record<string, unknown>, number>({
        state,
        now: clock.now(),
        overlapMs: OVERLAP_MS,
        maxPages: MAX_PAGES,
        pageSize: PER_PAGE,
        seenWindow: SEEN_WINDOW,
        seedRead: false,
        idOf: (r) => String(r[o.idField] ?? ""),
        tsOf: (r) => toMs(r.researchedAt ?? r.createdAt),
        async load(sinceMs, pos, untilMs) {
          const page = pos ?? 1;
          const res = await o.action.execute({
            startDate: new Date(sinceMs).toISOString(),
            endDate: new Date(untilMs).toISOString(),
            page,
            limit: PER_PAGE,
          }, ctx) as { data?: Array<Row & Record<string, unknown>> };
          const items = Array.isArray(res.data) ? res.data : [];
          return { items, next: items.length >= PER_PAGE ? page + 1 : undefined };
        },
      });
    },
  };
}
