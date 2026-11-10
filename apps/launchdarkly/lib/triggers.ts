import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import auditLogList from "../actions/audit-log-list.ts";

/** Look-back before the previous check, so an entry written late is still seen. */
export const OVERLAP_MS = 120_000;
/** LaunchDarkly caps `limit` at 20 for the audit log. */
export const PAGE_SIZE = 20;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

interface AuditEntry {
  _id: string;
  date?: number;
}

/** Pages read per check; a window longer than this is drained over successive checks (§9.8). */
export const MAX_PAGES = 5;
export const SEEN_WINDOW = 1000;

export interface AuditLogState {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  cursor: number;
  /** Resume position of an unfinished window: its `after`, the next `before`, and its end. */
  drain?: { after: number; before: number; end: number };
}

export interface AuditLogParams {
  spec?: string;
}

/**
 * Since-filter poll over `GET /auditlog`: asks for entries `after` the previous check (minus an
 * overlap) and dedupes by entry id. Entries come newest first, 20 per page (the vendor's cap), up
 * to MAX_PAGES pages per check. A window holding more is resumed: `before` moves to the oldest
 * entry read so far (state `drain`), and the cursor advances to the window's end only once a short
 * page shows the window is drained.
 */
export async function checkAuditLog(
  params: AuditLogParams,
  state: unknown,
  ctx: Parameters<typeof auditLogList.execute>[1],
): Promise<{ events: AuditEntry[]; nextState: AuditLogState }> {
  const prior = state as { cursor?: unknown; drain?: AuditLogState["drain"] } | null;
  const seeded = typeof prior?.cursor === "number";
  const checkedAt = clock.now();
  const cursor = seeded ? prior!.cursor as number : checkedAt;
  const drain = seeded ? prior!.drain : undefined;
  const after = drain ? drain.after : Math.max(0, cursor - OVERLAP_MS);
  const end = drain ? drain.end : checkedAt;
  let before: number | undefined = drain?.before;

  const listed: AuditEntry[] = [];
  let drained = false;
  for (let page = 0; page < (seeded ? MAX_PAGES : 1); page++) {
    const items = await auditLogList.execute({
      spec: params.spec,
      after: String(after),
      before: before === undefined ? undefined : String(before),
      limit: PAGE_SIZE,
    }, ctx) as AuditEntry[];
    const rows = Array.isArray(items) ? items : [];
    listed.push(...rows);
    if (rows.length < PAGE_SIZE) {
      drained = true;
      break;
    }
    const dates = rows.map((e) => Number(e.date)).filter(Number.isFinite);
    if (dates.length === 0) {
      drained = true; // no timestamp to resume from: cannot page further
      break;
    }
    const oldest = Math.min(...dates);
    // `before` is exclusive: +1 keeps entries sharing the oldest millisecond (ids dedupe them).
    before = before !== undefined && oldest + 1 >= before ? oldest : oldest + 1;
  }

  const { events, nextState } = await pollNewItems<AuditEntry>({
    state,
    maxPages: 1,
    maxEvents: MAX_PAGES * PAGE_SIZE,
    seenWindow: SEEN_WINDOW,
    idOf: (e) => e._id,
    fetchPage: () => Promise.resolve({ items: listed }),
  });
  const base = { ...nextState };
  if (!seeded || drained) return { events, nextState: { ...base, cursor: end } };
  return { events, nextState: { ...base, cursor, drain: { after, before: before!, end } } };
}

export const newAuditLogEntryTrigger: TriggerDefinition<AuditLogParams> = {
  key: "new-audit-log-entry",
  title: "New Audit Log Entry",
  description:
    "The run gets each new audit log entry (who changed which flag, segment, project or member, and when).",
  params: [{
    key: "spec",
    label: "Resource Specifier",
    type: "string",
    default: "",
    placeholder: "proj/default:env/production:flag/new-checkout",
    hint: "Optional LaunchDarkly resource syntax to narrow the entries watched.",
  }],
  output: [
    { key: "_id", type: "string", label: "Entry ID" },
    { key: "date", type: "number", label: "When (epoch ms)" },
    { key: "kind", type: "string", label: "Resource kind" },
    { key: "name", type: "string", label: "Resource name" },
    { key: "description", type: "string", label: "Description" },
    { key: "title", type: "string", label: "Title" },
  ],
  sample: {
    _id: "6551a1f2c3d4e5f600000001",
    date: 1762689600000,
    kind: "flag",
    name: "New checkout",
    description: "Turned the flag on in production",
    title: "Someone turned on the flag",
  },
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    return checkAuditLog(params, state, ctx);
  },
};
