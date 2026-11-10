import type { TriggerDefinition } from "@w6w/types";
import affiliateProgramsList from "../actions/affiliate-programs-list.ts";
import { newRecords, readAll } from "../lib/triggers.ts";

/**
 * The programs one affiliate has applied to or joined are a small bounded collection with no
 * timestamps (`GET /affiliates/{id}/programs/`,
 * https://developers.tapfiliate.com/api-reference/affiliates/get-affiliations, 2026-11-10): every check reads `affiliate-programs-list` for the chosen affiliate and diffs the
 * program ids (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-affiliate-program",
  title: "New Affiliate Program Membership",
  description: "The run gets each program the chosen affiliate newly applies to or joins.",
  params: [{
    key: "affiliateId",
    label: "Affiliate",
    type: "string",
    required: true,
    hint: "The affiliate's id (their referral-link slug, e.g. janejameson).",
  }],
  output: [
    { key: "id", type: "string", label: "Program ID" },
    { key: "title", type: "string", label: "Program title" },
    { key: "applied_at", type: "string", label: "Applied at" },
    { key: "approved", type: "boolean", label: "Approved" },
    { key: "referral_link", type: "object", label: "Referral link" },
    { key: "coupon", type: "string", label: "Coupon" },
  ],
  sample: {
    id: "johns-affiliate-program",
    title: "John's affiliate program",
    applied_at: "2026-11-09T12:00:00+00:00",
    approved: true,
    referral_link: { asset_id: "1-aaaaaa", source_id: "1-ssssss" },
    coupon: "JANE10OFF",
  },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const items = await readAll(affiliateProgramsList, {
      affiliateId: (params as { affiliateId?: string }).affiliateId,
    }, ctx);
    return newRecords({ state, items, idOf: (p) => (p as { id?: unknown }).id });
  },
};

export default trigger;
