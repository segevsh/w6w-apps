import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient, toObject } from "../lib/client.ts";

/**
 * `PUT /projects/{projectId}/billing` — Set a project's billing type, rates and budget.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  projectId: string;
  billing?: unknown;
  rate?: unknown;
  budget?: unknown;
}

const projectBillingSet: ActionDefinition<Input> = {
  key: "project-billing-set",
  type: "perform",
  resource: "project",
  title: "Set Project Billing And Budget",
  description: "Set a project's billing type, rates and budget.",
  idempotent: true,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint:
        "Everhour project id: `ev:1234567890` for a native project, or `{platform}:{id}` such as `as:123456` for an integration project.",
    },
    {
      key: "billing",
      label: "Billing",
      type: "json",
      hint:
        'JSON `{"type": "hourly"|"fixed_fee"|"non_billable", "fee": 50000}` (fee in cents, fixed_fee only).',
    },
    {
      key: "rate",
      label: "Rate",
      type: "json",
      hint:
        'JSON `{"type": "project_rate", "rate": 10000}` or `{"type": "user_rate", "userRateOverrides": {"1304": 10000}}` (cents per hour).',
    },
    {
      key: "budget",
      label: "Budget",
      type: "json",
      hint:
        'JSON `{"type": "money"|"time"|"costs", "budget": 50000, "period": "general", "threshold": 80}`; cents or seconds.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "billing", type: "object", label: "Billing" },
    { key: "budget", type: "object", label: "Budget" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/projects/${encodeId(input.projectId)}/billing`, {
      method: "PUT",
      body: compact({
        billing: toObject(input.billing, "billing"),
        rate: toObject(input.rate, "rate"),
        budget: toObject(input.budget, "budget"),
      }),
    });
  },
};

export default projectBillingSet;
