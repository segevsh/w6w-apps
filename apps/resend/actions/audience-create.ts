import type { ActionDefinition } from "@w6w/types";
import { ResendClient } from "../lib/client.ts";

/**
 * `POST /audiences` — verified against Resend's OpenAPI document (body
 * requires `name`).
 */
const action: ActionDefinition = {
  key: "audience-create",
  type: "perform",
  resource: "audience",
  title: "Create an audience",
  description: "Create a list of contacts.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Audience ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "object", type: "string", label: "Object type" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    ctx.log("info", "creating Resend audience", { name });
    return await new ResendClient(ctx).request("/audiences", {
      method: "POST",
      body: { name },
    });
  },
};

export default action;
