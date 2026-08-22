import type { ActionDefinition } from "@w6w/types";
import { compact, json, MiroClient } from "../lib/client.ts";

/**
 * `POST /v2/boards` — verified against Miro's OpenAPI document
 * (`create-board`). Nothing is required; an empty body creates an untitled
 * board in the default team.
 *
 * `policy` is passed as JSON: it nests `permissionsPolicy` (collaboration
 * toolbar, copy access, sharing) and `sharingPolicy` (access, invite settings,
 * team access) — a two-level object that flat fields would misrepresent.
 */
const action: ActionDefinition = {
  key: "board-create",
  type: "perform",
  resource: "board",
  title: "Create a board",
  description: "Create a new Miro board.",
  // Two calls make two boards — Miro does not dedupe on name.
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      default: "",
      hint: "Miro titles it for you when blank.",
    },
    { key: "description", label: "Description", type: "text", default: "" },
    { key: "teamId", label: "Team ID", type: "string", default: "" },
    { key: "projectId", label: "Project ID", type: "string", default: "" },
    {
      key: "policy",
      label: "Policy",
      type: "json",
      default: "",
      placeholder: '{"sharingPolicy":{"access":"private"}}',
      hint: "Nests permissionsPolicy and sharingPolicy.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Board ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "viewLink", type: "string", label: "View link" },
    { key: "team", type: "object", label: "Team" },
    { key: "policy", type: "object", label: "Policy" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const body = compact({
      name: p.name,
      description: p.description,
      teamId: p.teamId,
      projectId: p.projectId,
      policy: json(p.policy, "policy"),
    });

    ctx.log("info", "creating Miro board", { name: p.name });

    return await new MiroClient(ctx).request("/v2/boards", { method: "POST", body });
  },
};

export default action;
