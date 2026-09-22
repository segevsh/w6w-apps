import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";

/**
 * `GET /v1.0/org` — the organization structure the caller belongs to.
 *
 * Answers `orgType` plus whichever of the two package shapes applies:
 * `enterpriseInfo` for an Enterprise Package account, or `multiTeamInfo` for a
 * Multi-Team one. The response is whatever structure the account's package
 * defines, so the fields beyond `orgType` are deliberately not projected into
 * this action's output.
 *
 * This is the endpoint for decisions that depend on the organization rather
 * than the team: which offices exist, and how teams relate to each other.
 */
const action: ActionDefinition = {
  key: "org-get",
  type: "read",
  resource: "organization",
  title: "Get Organization",
  description: "Fetch the organization structure the caller belongs to (GET /v1.0/org).",
  params: [],
  output: [
    { key: "orgType", type: "number", label: "Organization type" },
    { key: "enterpriseInfo", type: "object", label: "Enterprise structure, if applicable" },
    { key: "multiTeamInfo", type: "object", label: "Multi-team structure, if applicable" },
  ],

  execute(_input, ctx) {
    return new LoftyClient(ctx).request("/org");
  },
};

export default action;
