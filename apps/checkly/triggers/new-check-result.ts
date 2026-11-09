import { clock, sinceTrigger } from "../lib/since.ts";
import checkResultList from "../actions/check-result-list.ts";

interface Params {
  checkId?: string;
  failuresOnly?: boolean;
}

interface CheckResult {
  id?: string;
}

/** A trigger that was stopped for a long time looks back at most this far, not at every run since. */
export const MAX_LOOKBACK_MS = 3_600_000;

export default sinceTrigger<CheckResult, Params>({
  key: "new-check-result",
  title: "New Check Result",
  description:
    "The run gets each new final result of one Checkly check (optionally only the failures).",
  params: [
    { key: "checkId", label: "Check ID", type: "string", required: true },
    {
      key: "failuresOnly",
      label: "Failures only",
      type: "boolean",
      default: false,
      hint: "Only results with failures; recommended for a busy check.",
    },
  ],
  async fetchPage(sinceMs, _page, ctx, params) {
    const from = Math.max(sinceMs, clock.now() - MAX_LOOKBACK_MS);
    const items = await checkResultList.execute({
      checkId: params.checkId ?? "",
      hasFailures: params.failuresOnly === true,
      resultType: "FINAL",
      from: String(Math.floor(from / 1000)),
      returnAll: true,
    }, ctx) as CheckResult[];
    return { items: Array.isArray(items) ? items : [], more: false };
  },
  idOf: (r) => String(r.id),
  output: [
    { key: "id", type: "string", label: "Result ID" },
    { key: "checkId", type: "string", label: "Check ID" },
    { key: "name", type: "string", label: "Check name" },
    { key: "hasFailures", type: "boolean", label: "Has failures" },
    { key: "startedAt", type: "string", label: "Started at" },
    { key: "responseTime", type: "number", label: "Response time (ms)" },
    { key: "resultType", type: "string", label: "Result type" },
  ],
  sample: {
    id: "9d1c7f0e-8a3b-4c52-b1f4-0e2a6d7c5b11",
    checkId: "f3c2a1b0-1234-4abc-9def-001122334455",
    name: "Homepage",
    hasFailures: true,
    startedAt: "2026-11-09T09:00:00.000Z",
    responseTime: 842,
    resultType: "FINAL",
  },
});
