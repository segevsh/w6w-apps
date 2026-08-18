import type { ActionDefinition } from "@w6w/types";
import { compact, json, MiroClient } from "../lib/client.ts";

/**
 * `PUT /v2/boards?copy_from={id}` — verified against Miro's OpenAPI document
 * (`copy-board`).
 *
 * Two things a reader would otherwise get wrong: it is a **PUT** on the
 * collection, not a POST to a `/copy` sub-path, and the source board is a
 * **query parameter**, not part of the body. This is the "instantiate a
 * template" action.
 */
const action: ActionDefinition = {
  key: "board-copy",
  type: "perform",
  resource: "board",
  title: "Copy a board",
  description: "Duplicate an existing board, optionally renaming the copy.",
  // Each call produces another copy.
  idempotent: false,
  params: [
    {
      key: "copyFrom",
      label: "Source Board ID",
      type: "string",
      required: true,
      default: "",
      hint: "The board to copy. Sent as the `copy_from` query parameter.",
    },
    { key: "name", label: "Name", type: "string", default: "" },
    { key: "description", label: "Description", type: "text", default: "" },
    { key: "teamId", label: "Team ID", type: "string", default: "" },
    { key: "policy", label: "Policy", type: "json", default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Board ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "viewLink", type: "string", label: "View link" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const copyFrom = String(p.copyFrom ?? "").trim();
    if (!copyFrom) throw new Error("`copyFrom` is required");

    const body = compact({
      name: p.name,
      description: p.description,
      teamId: p.teamId,
      policy: json(p.policy, "policy"),
    });

    ctx.log("info", "copying Miro board", { copyFrom });

    return await new MiroClient(ctx).request("/v2/boards", {
      method: "PUT",
      query: { copy_from: copyFrom },
      body,
    });
  },
};

export default action;
