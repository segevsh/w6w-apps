import type { ActionDefinition } from "@w6w/types";
import { GotifyClient } from "../lib/client.ts";

/**
 * `PUT /client/{id}` — verified against Gotify's OpenAPI document
 * (`updateClient`) and its handler (`api/client.go`, `UpdateClient`). Unlike
 * an application update, this one genuinely is a partial update:
 * `expiresAfterInactivitySeconds` is a `*uint` and is only applied "if not
 * nil" — so it can be left unset here to leave the current expiry alone,
 * rather than accidentally resetting it to "never expires".
 *
 * Plain `RequireClient`, not the elevated session `DELETE /client/{id}`
 * demands (`router/router.go`) — renaming a client is not treated as
 * destructive.
 */
const action: ActionDefinition = {
  key: "client-update",
  type: "perform",
  resource: "client",
  title: "Update client",
  description: "Rename a client, or change its inactivity expiry.",
  idempotent: true,
  params: [
    { key: "id", label: "Client ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "expiresAfterInactivitySeconds",
      label: "Expire after inactivity (seconds)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Leave blank to leave the current expiry unchanged — Gotify only overwrites this " +
        "field when it is present in the request.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Client ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "expiresAfterInactivitySeconds", type: "number", label: "Expires after inactivity" },
    { key: "expiresAt", type: "string", label: "Expires at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = Number(p.id);
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    const body: Record<string, unknown> = { name };
    if (p.expiresAfterInactivitySeconds !== undefined && p.expiresAfterInactivitySeconds !== "") {
      body.expiresAfterInactivitySeconds = Number(p.expiresAfterInactivitySeconds);
    }

    ctx.log("info", "updating a Gotify client", { id });
    return await new GotifyClient(ctx).request(`/client/${encodeURIComponent(String(id))}`, {
      method: "PUT",
      body,
    });
  },
};

export default action;
