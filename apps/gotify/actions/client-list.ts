import type { ActionDefinition } from "@w6w/types";
import { GotifyClient } from "../lib/client.ts";

/**
 * `GET /client` — verified against Gotify's OpenAPI document (`getClients`).
 * Like applications, a client's usable token is minted once (at
 * `client-create`) and this list returns only the public form afterwards —
 * see `application-list`'s note on the same token scheme
 * (`auth/token.go`).
 */
const action: ActionDefinition = {
  key: "client-list",
  type: "read",
  resource: "client",
  title: "List clients",
  description: "List the clients (receivers/managers) registered on this account.",
  params: [],
  output: [
    { key: "id", type: "number", label: "Client ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "token", type: "string", label: "Token" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "lastUsed", type: "string", label: "Last used" },
    { key: "expiresAt", type: "string", label: "Expires at" },
    { key: "elevatedUntil", type: "string", label: "Elevated until" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "listing Gotify clients");
    return await new GotifyClient(ctx).request("/client");
  },
};

export default action;
