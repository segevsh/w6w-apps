import type { ActionDefinition } from "@w6w/types";
import { flatten, TerraformClient } from "../lib/client.ts";

/**
 * `GET /api/v2/organizations/{name}` — one organisation's settings.
 *
 * The two attributes worth reading before pointing an automation at it:
 *
 * - **`cost-estimation-enabled`** decides whether a plan carries a price. When
 *   it is on, a run has an extra `cost_estimated` phase, and a workflow that
 *   waits for `planned` waits through a state it did not expect.
 * - **`collaborator-auth-policy`** — when it is `two_factor_mandatory`, an
 *   account without 2FA cannot act at all, and its token fails everywhere with
 *   no mention of the reason.
 */
const action: ActionDefinition = {
  key: "organization-get",
  type: "read",
  resource: "organization",
  title: "Get an organization",
  description:
    "One organisation's settings. `cost-estimation-enabled` adds a phase to every run, and a " +
    "two-factor auth policy silently disables tokens belonging to accounts without it.",
  params: [
    {
      key: "organization",
      label: "Organization",
      type: "string",
      required: true,
      default: "",
      hint: "The organisation NAME — it is the identifier.",
    },
  ],
  output: [
    { key: "organization", type: "object", label: "The flattened organisation" },
    { key: "name", type: "string", label: "Its name" },
    { key: "costEstimation", type: "boolean", label: "Whether runs carry a cost estimate" },
    { key: "authPolicy", type: "string", label: "The collaborator auth policy" },
    { key: "planExpired", type: "boolean", label: "Whether the trial or plan has lapsed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.organization ?? "").trim();
    if (!name) throw new Error("`organization` is required");

    const document = await new TerraformClient(ctx).request(
      `/api/v2/organizations/${encodeURIComponent(name)}`,
    );
    const organization = flatten(document.data as never) ?? {};

    return {
      organization,
      name: organization["name"],
      costEstimation: organization["cost-estimation-enabled"] === true,
      authPolicy: organization["collaborator-auth-policy"],
      planExpired: organization["permissions"] === undefined
        ? undefined
        : organization["plan-expired"] === true,
    };
  },
};

export default action;
