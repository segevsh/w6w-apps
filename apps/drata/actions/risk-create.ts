import type { ActionDefinition } from "@w6w/types";
import { compact, DrataClient, seg, toList } from "../lib/client.ts";
import { opts, riskStatuses, treatmentPlans } from "../lib/params.ts";

/**
 * `POST /risk-registers/{riskRegisterId}/risks` — add a risk to a register.
 *
 * `owners`, `reviewers`, `controls` and `categories` are arrays of `{ id }`
 * objects on the wire, not arrays of ids; this action takes plain comma-separated
 * ids and wraps them. `impact` and `likelihood` are 1–10 here (the register's
 * `score` filters on the list endpoint run 1–25, the product of the two scales).
 */
interface Input {
  riskRegisterId: number;
  title: string;
  description: string;
  impact?: number;
  likelihood?: number;
  treatmentPlan?: string;
  treatmentDetails?: string;
  status?: string;
  identifiedAt?: string;
  ownerIds?: string;
  reviewerIds?: string;
  controlIds?: string;
  categoryIds?: string;
}

const wrapIds = (v: string | undefined): Array<{ id: number }> | undefined => {
  const list = toList(v);
  if (!list) return undefined;
  return list.map((s) => {
    const id = Number(s);
    if (!Number.isInteger(id)) throw new Error(`"${s}" is not a numeric id`);
    return { id };
  });
};

const action: ActionDefinition<Input> = {
  key: "risk-create",
  type: "perform",
  resource: "risk",
  title: "Create Risk",
  description: "Add a risk to a risk register.",
  idempotent: false,
  params: [
    {
      key: "riskRegisterId",
      label: "Risk register ID",
      type: "number",
      required: true,
      hint: "Numeric id from List Risk Registers.",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      validation: { maxLength: 191 },
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      required: true,
      validation: { maxLength: 768 },
    },
    {
      key: "impact",
      label: "Impact",
      type: "number",
      validation: { min: 1, max: 10, integer: true },
    },
    {
      key: "likelihood",
      label: "Likelihood",
      type: "number",
      validation: { min: 1, max: 10, integer: true },
    },
    {
      key: "treatmentPlan",
      label: "Treatment plan",
      type: "select",
      options: opts(treatmentPlans),
    },
    { key: "treatmentDetails", label: "Treatment details", type: "text" },
    { key: "status", label: "Status", type: "select", options: opts(riskStatuses) },
    { key: "identifiedAt", label: "Identified on", type: "date" },
    { key: "ownerIds", label: "Owner user IDs", type: "string", hint: "Comma-separated." },
    { key: "reviewerIds", label: "Reviewer user IDs", type: "string", hint: "Comma-separated." },
    { key: "controlIds", label: "Control IDs", type: "string", hint: "Comma-separated." },
    { key: "categoryIds", label: "Category IDs", type: "string", hint: "Comma-separated." },
  ],
  output: [
    { key: "id", type: "number", label: "Risk ID" },
    { key: "riskId", type: "string", label: "Risk identifier (e.g. RISK-001)" },
    { key: "title", type: "string", label: "Title" },
    { key: "score", type: "number", label: "Inherent score" },
  ],

  execute(input, ctx) {
    const { riskRegisterId, ownerIds, reviewerIds, controlIds, categoryIds, ...rest } = input;
    return new DrataClient(ctx).post(
      `/risk-registers/${seg(riskRegisterId)}/risks`,
      compact({
        ...rest,
        owners: wrapIds(ownerIds),
        reviewers: wrapIds(reviewerIds),
        controls: wrapIds(controlIds),
        categories: wrapIds(categoryIds),
      }),
    );
  },
};

export default action;
