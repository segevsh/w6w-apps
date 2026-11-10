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

export interface AuditLogState {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  cursor: number;
}

export interface AuditLogParams {
  spec?: string;
}

/**
 * Since-filter poll over `GET /auditlog`: asks for entries `after` the previous check (minus an
 * overlap) and dedupes by entry id. Up to 20 entries are read per check (the vendor's page cap).
 */
export async function checkAuditLog(
  params: AuditLogParams,
  state: unknown,
  ctx: Parameters<typeof auditLogList.execute>[1],
): Promise<{ events: AuditEntry[]; nextState: AuditLogState }> {
  const checkedAt = clock.now();
  const prior = state as { cursor?: unknown } | null;
  const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
  const { events, nextState } = await pollNewItems<AuditEntry>({
    state,
    maxPages: 1,
    idOf: (e) => e._id,
    async fetchPage() {
      const items = await auditLogList.execute({
        spec: params.spec,
        after: String(Math.max(0, cursor - OVERLAP_MS)),
        limit: PAGE_SIZE,
      }, ctx) as AuditEntry[];
      return { items: Array.isArray(items) ? items : [] };
    },
  });
  return { events, nextState: { ...nextState, cursor: checkedAt } };
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
