import type { ActionDefinition } from "@w6w/types";
import { compact, GotifyClient } from "../lib/client.ts";

/**
 * `POST /client` — verified against Gotify's OpenAPI document
 * (`createClient`). Like an application, the usable client token is returned
 * only here — capture it now, since `client-list` returns a blanked token
 * afterwards (`api/client.go`, `GetClients`).
 *
 * A client created this way is a normal, unelevated client — it can do
 * everything a plain `RequireClient` route allows, but not the two
 * elevation-gated deletes; see `auth/token.ts` for why those are out of
 * scope entirely.
 */
const action: ActionDefinition = {
  key: "client-create",
  type: "perform",
  resource: "client",
  title: "Create client",
  description: "Register a new client and mint its token.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "expiresAfterInactivitySeconds",
      label: "Expire after inactivity (seconds)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "0 or blank means the client never expires.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Client ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "token", type: "string", label: "Token — shown only this once" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    ctx.log("info", "creating a Gotify client", { name });
    return await new GotifyClient(ctx).request("/client", {
      method: "POST",
      body: compact({
        name,
        expiresAfterInactivitySeconds: p.expiresAfterInactivitySeconds === undefined
          ? undefined
          : Number(p.expiresAfterInactivitySeconds),
      }),
    });
  },
};

export default action;
