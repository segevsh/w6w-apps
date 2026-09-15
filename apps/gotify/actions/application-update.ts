import type { ActionDefinition } from "@w6w/types";
import { compact, GotifyClient } from "../lib/client.ts";

/**
 * `PUT /application/{id}` — verified against Gotify's OpenAPI document
 * (`updateApplication`). Plain `RequireClient`, not the elevated session
 * `DELETE /application/{id}` demands (`router/router.go`) — renaming or
 * re-prioritizing an application is not treated as destructive.
 *
 * Gotify's `ApplicationParams` requires `name` on every PUT, not just
 * `POST` — there is no partial-update form, so leaving `name` blank here
 * would silently rename the application to an empty string. This action
 * requires it for that reason, even though nothing else has to change.
 */
const action: ActionDefinition = {
  key: "application-update",
  type: "perform",
  resource: "application",
  title: "Update application",
  description: "Rename an application or change its default priority.",
  idempotent: true,
  params: [
    { key: "id", label: "Application ID", type: "number", required: true },
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "Gotify's update call has no partial form — the current name must be resent even " +
        "when only the description or priority is changing.",
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "defaultPriority",
      label: "Default priority",
      type: "number",
      default: 0,
      validation: { integer: true, min: 0, max: 10 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Application ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "defaultPriority", type: "number", label: "Default priority" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = Number(p.id);
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    ctx.log("info", "updating a Gotify application", { id });
    return await new GotifyClient(ctx).request(`/application/${encodeURIComponent(String(id))}`, {
      method: "PUT",
      body: compact({
        name,
        description: p.description,
        defaultPriority: p.defaultPriority === undefined ? undefined : Number(p.defaultPriority),
      }),
    });
  },
};

export default action;
