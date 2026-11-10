import { sinceTrigger, toMs } from "../lib/since.ts";
import listSignals from "../actions/list-signals.ts";

/** Vendor maximum (`per_page`: "max: 100, default: 50", OpenAPI `listSignals`). */
export const PAGE_SIZE = 100;

interface Signal {
  id?: number | string;
  detected_at?: string;
}
interface Params {
  signal_type?: string;
  monitor_id?: number;
}

/** `date_from` is "detected on or after this date (YYYY-MM-DD)": a whole UTC day. */
export const fromDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export default sinceTrigger<Signal, Params>({
  key: "new-signal",
  title: "New Signal",
  description: "The run gets each signal newly detected by your monitors.",
  params: [
    {
      key: "signal_type",
      label: "Signal type",
      type: "select",
      options: [
        { value: "keyword_mention", label: "keyword_mention" },
        { value: "new_hire", label: "new_hire" },
        { value: "job_change", label: "job_change" },
        { value: "post_engagement", label: "post_engagement" },
      ],
      hint: "Blank = every type.",
    },
    { key: "monitor_id", label: "Monitor ID", type: "number", hint: "Blank = every monitor." },
  ],
  async fetchPage(sinceMs, page, ctx, params) {
    const res = await listSignals.execute({
      signal_type: params.signal_type,
      monitor_id: params.monitor_id,
      date_from: fromDate(sinceMs),
      page,
      per_page: PAGE_SIZE,
    }, ctx) as { data?: Signal[]; meta?: { current_page?: number; last_page?: number } };
    const items = res.data ?? [];
    const more = res.meta?.last_page !== undefined && res.meta.current_page !== undefined
      ? res.meta.current_page < res.meta.last_page
      : items.length >= PAGE_SIZE;
    return { items, more };
  },
  pageSize: PAGE_SIZE,
  idOf: (s) => String(s.id),
  tsOf: (s) => toMs(s.detected_at),
  output: [
    { key: "id", type: "number", label: "Signal ID" },
    { key: "type", type: "string", label: "Signal type" },
    { key: "category", type: "string", label: "Category (contact or company)" },
    { key: "detected_at", type: "string", label: "Detected at" },
    { key: "payload", type: "object", label: "What was detected" },
    { key: "contact", type: "object", label: "The contact, when the signal is about one" },
    { key: "company", type: "object", label: "The company" },
    { key: "monitors", type: "array", label: "Monitors that matched" },
  ],
  sample: {
    id: 1,
    type: "keyword_mention",
    category: "contact",
    payload: { matched_keyword: "hiring", snippet: "We are hiring a new VP of Sales..." },
    detected_at: "2026-03-01T12:00:00+00:00",
    contact: { id: 1, name: "John Doe", job_title: "CEO" },
    company: { id: 1, name: "Acme Corp", domain: "acme.com" },
    monitors: [{ id: 1, name: "Hiring monitor" }],
  },
});
