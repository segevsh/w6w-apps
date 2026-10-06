import type { ActionDefinition } from "@w6w/types";
import { ClearoutClient } from "../lib/client.ts";

/** `GET /account/myplans` — the current plan and add-ons. */
const getPlans: ActionDefinition = {
  key: "get-plans",
  type: "read",
  resource: "account",
  title: "Get Plans and Add-ons",
  description: "Read the account's current plan and add-ons (name, status, type, charge, next " +
    "credit allocation and renewal dates). Free.",
  params: [],
  output: [
    { key: "currentPlan", type: "object", label: "Current plan" },
    { key: "addons", type: "array", label: "Add-ons" },
  ],

  async execute(_input, ctx) {
    const { data } = await new ClearoutClient(ctx).request("/account/myplans");
    const d = (data ?? {}) as { current_plan?: unknown; addons?: unknown[] };
    return { currentPlan: d.current_plan ?? null, addons: d.addons ?? [] };
  },
};

export default getPlans;
