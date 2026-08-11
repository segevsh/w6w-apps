import type { ActionDefinition } from "@w6w/types";
import { encodeId, HousecallClient, toList } from "../lib/client.ts";
import { companyIdParam, PARTNER_ONLY_NOTE } from "../lib/params.ts";

/**
 * `GET /estimates/{estimate_id}` — one estimate with all of its options.
 *
 * Note the asymmetry with `GET /estimates`: the list accepts a Company API Key,
 * this single read does not. That is the reference's own `security` block, not
 * an inference — a Pro's own key can list estimates but must read an individual
 * one out of that list.
 */
interface Input {
  estimateId: string;
  expand?: string[] | string;
  companyId?: string;
}

const estimateGet: ActionDefinition<Input> = {
  key: "estimate-get",
  type: "read",
  resource: "estimate",
  title: "Get Estimate",
  description: "Fetch one estimate by id, with its options. " + PARTNER_ONLY_NOTE +
    " Find Estimates does accept one, and returns the same records.",
  params: [
    { key: "estimateId", label: "Estimate ID", type: "string", required: true },
    {
      key: "expand",
      label: "Expand",
      type: "multiselect",
      options: [{ value: "attachments", label: "Attachments" }],
    },
    companyIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Estimate ID" },
    { key: "estimate_number", type: "string", label: "Estimate number" },
    { key: "work_status", type: "string", label: "Work status" },
    { key: "options", type: "array", label: "Options" },
    { key: "schedule", type: "object", label: "Schedule" },
  ],

  execute(input, ctx) {
    return new HousecallClient(ctx).json(`/estimates/${encodeId(input.estimateId)}`, {
      companyId: input.companyId,
      query: { expand: toList(input.expand) },
    });
  },
};

export default estimateGet;
