import { clock, sinceTrigger } from "../lib/since.ts";
import checkAlertList from "../actions/check-alert-list.ts";

interface Params {
  checkId?: string;
}

interface Alert {
  id?: string;
  created_at?: string;
}

/** A trigger that was stopped for a long time looks back at most this far, not at every alert since. */
export const MAX_LOOKBACK_MS = 3_600_000;

// GET /v1/check-alerts takes `from` (UNIX seconds) and answers a 6-hour window starting there
// (https://api.checklyhq.com/openapi.json, verified 2026-11-10); the window is walked in full
// (every page) on each check, so there is nothing to resume. Alerts older than the first check
// are dropped by their `created_at`.
export default sinceTrigger<Alert, Params>({
  key: "new-check-alert",
  title: "New Check Alert",
  description: "The run gets each alert Checkly sends (optionally for one check).",
  params: [
    {
      key: "checkId",
      label: "Check ID",
      type: "string",
      hint: "Only alerts of this check; blank = every check in the account.",
    },
  ],
  async fetchPage(sinceMs, _page, ctx, params) {
    const from = Math.max(sinceMs, clock.now() - MAX_LOOKBACK_MS);
    const items = await checkAlertList.execute({
      checkId: params.checkId ?? "",
      from: String(Math.floor(from / 1000)),
      returnAll: true,
    }, ctx) as Alert[];
    return { items: Array.isArray(items) ? items : [], more: false };
  },
  idOf: (a) => String(a.id),
  createdAtOf: (a) => (a.created_at ? Date.parse(a.created_at) : undefined),
  output: [
    { key: "id", type: "string", label: "Alert ID" },
    { key: "checkId", type: "string", label: "Check ID" },
    { key: "name", type: "string", label: "Check name" },
    { key: "alertType", type: "string", label: "Alert type" },
    { key: "created_at", type: "string", label: "Sent at" },
  ],
  sample: {
    id: "alert-101",
    checkId: "f3c2a1b0-1234-4abc-9def-001122334455",
    name: "Homepage",
    alertType: "ALERT_FAILURE",
    created_at: "2026-11-09T09:00:00.000Z",
  },
});
