import type { ActionDefinition } from "@w6w/types";
import { DrataClient, seg, toList } from "../lib/client.ts";
import { expandParam, opts, pageParams, riskStatuses, treatmentPlans } from "../lib/params.ts";

/**
 * `GET /risk-registers/{riskRegisterId}/risks` — List the risks in one risk register, filtered by status, treatment or score.
 *
 * Cursor-paginated: pass the result's `nextCursor` back as `cursor` until it is `null`.
 */
interface Input {
  riskRegisterId: number;
  title?: string;
  status?: string;
  treatmentPlan?: string;
  minScore?: number;
  maxScore?: number;
  expand?: string[] | string;
  cursor?: string;
  size?: number;
  includeTotalCount?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "risk-list",
  type: "search",
  resource: "risk",
  title: "List Risks",
  description: "List the risks in one risk register, filtered by status, treatment or score.",
  params: [
    {
      key: "riskRegisterId",
      label: "Risk register ID",
      type: "number",
      required: true,
      hint: "Numeric id from List Risk Registers.",
    },
    { key: "title", label: "Title", type: "string", hint: "Substring match." },
    { key: "status", label: "Status", type: "select", options: opts(riskStatuses) },
    {
      key: "treatmentPlan",
      label: "Treatment plan",
      type: "select",
      options: opts(treatmentPlans),
    },
    { key: "minScore", label: "Minimum score", type: "number", hint: "1–25." },
    { key: "maxScore", label: "Maximum score", type: "number", hint: "1–25." },
    expandParam([
      "owners",
      "reviewers",
      "controls",
      "categories",
      "documents",
      "notes",
      "tickets",
      "tasks",
      "customFields",
    ]),
    ...pageParams,
  ],
  output: [
    { key: "items", type: "array", label: "Risks" },
    {
      key: "nextCursor",
      type: "string",
      label: "Cursor for the next page (null on the last page)",
    },
    {
      key: "totalCount",
      type: "number",
      label: "Total matching records (only with Include total count, first page)",
    },
  ],

  execute(input, ctx) {
    return new DrataClient(ctx).list(`/risk-registers/${seg(input.riskRegisterId)}/risks`, {
      "title": input.title,
      "status": input.status,
      "treatmentPlan": input.treatmentPlan,
      "minScore": input.minScore,
      "maxScore": input.maxScore,
      "expand[]": toList(input.expand),
      cursor: input.cursor,
      size: input.size,
      includeTotalCount: input.includeTotalCount || undefined,
    });
  },
};

export default action;
