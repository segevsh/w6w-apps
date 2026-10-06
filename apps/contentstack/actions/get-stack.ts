import type { ActionDefinition } from "@w6w/types";
import { bool, call, compact, str } from "../lib/client.ts";

/**
 * `GET /v3/stacks` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "get-stack",
  type: "read",
  resource: "stack",
  title: "Get Stack",
  description: "Details of the stack the credential belongs to.",
  params: [
    {
      key: "includeCollaborators",
      label: "Include collaborators",
      type: "boolean",
      hint: "Include the stack collaborators.",
    },
    {
      key: "includeStackVariables",
      label: "Include stack variables",
      type: "boolean",
      hint: "Include stack variables.",
    },
    {
      key: "organizationUid",
      label: "Organization uid",
      type: "string",
      hint: "Required only for SSO-enabled organizations.",
    },
  ],
  output: [
    {
      key: "stack",
      type: "object",
      label: "Stack details (name, uid, master_locale, org_uid)",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const includeCollaborators = bool(p.includeCollaborators);
    const includeStackVariables = bool(p.includeStackVariables);
    const organizationUid = str(p.organizationUid);
    ctx.log("info", "Contentstack Get Stack");
    return await call(ctx, "GET", "/stacks", {
      query: {
        include_collaborators: includeCollaborators,
        include_stack_variables: includeStackVariables,
      },
      headers: compact({ organization_uid: organizationUid }),
    });
  },
};

export default action;
