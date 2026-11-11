import type { FacebookListResponse } from "../lib/client.ts";
import { sinceTrigger } from "../lib/triggers.ts";
import listRecentLeads from "../actions/list-recent-leads.ts";

/** Graph writes `2026-11-10T09:00:00+0000`; make the offset ISO so `Date.parse` is exact. */
const stampOf = (item: unknown): number => {
  const raw = String((item as { created_time?: unknown }).created_time ?? "");
  return Date.parse(raw.replace(/([+-]\d{2})(\d{2})$/, "$1:$2")) || 0;
};

/**
 * New Lead (poll): the same `list-recent-leads` action (`GET /{form_id}/leads`) with the documented
 * `filtering` argument (`time_created` GREATER_THAN, unix seconds; Lead Ads, "Filtering Leads"),
 * so the run carries the lead's answers (the webhook delivers only ids) and no dashboard webhook
 * set-up is needed. Three pages of 100 per check; Graph's own `after` cursor is the resume position
 * (`paging.cursors.after` while `paging.next` is present), so a window of any size drains across
 * checks.
 */
export default sinceTrigger<{ formId?: string }>({
  key: "new-lead-poll",
  title: "New Lead (poll)",
  description:
    "The run gets each new lead submitted through the chosen Lead Ads form, with the answers to its fields, checked on a schedule.",
  params: [{
    key: "formId",
    label: "Form ID",
    type: "string",
    required: true,
    hint: "From List Lead Ads Forms.",
  }],
  async load(since, params, ctx, at) {
    const formId = params?.formId?.trim();
    if (!formId) throw new Error("Form ID is required");
    const createdAfter = Math.floor(Date.parse(since) / 1000);
    const out: unknown[] = [];
    let cursor: string | undefined = at;
    let next: string | undefined;
    for (let page = 0; page < 3; page++) {
      const body = await listRecentLeads.execute({
        formId,
        createdAfter,
        limit: 100,
        cursor,
      }, ctx) as FacebookListResponse<unknown>;
      out.push(...(body?.data ?? []));
      const after = body?.paging?.cursors?.after;
      if (!body?.paging?.next || !after) break;
      cursor = after;
      if (page === 2) next = after;
    }
    return { items: out, next };
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  stampOf,
  output: [
    { key: "id", type: "string", label: "Lead ID" },
    { key: "created_time", type: "string", label: "Created time" },
    { key: "form_id", type: "string", label: "Form ID" },
    { key: "ad_id", type: "string", label: "Ad ID" },
    { key: "ad_name", type: "string", label: "Ad name" },
    { key: "adset_id", type: "string", label: "Ad set ID" },
    { key: "adset_name", type: "string", label: "Ad set name" },
    { key: "field_data", type: "array", label: "Answers (name and values)" },
  ],
  sample: {
    id: "444444444444",
    created_time: "2026-11-10T09:00:00+0000",
    form_id: "222222222222",
    ad_id: "6100000000000",
    ad_name: "November offer",
    adset_id: "6200000000000",
    adset_name: "Warm audience",
    field_data: [{ name: "email", values: ["ada@example.com"] }],
  },
});
