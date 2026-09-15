import type { ActionDefinition } from "@w6w/types";
import { GotifyClient } from "../lib/client.ts";

/**
 * `GET /application` — verified against Gotify's OpenAPI document
 * (`getApps`) and its handler (`api/application.go`, `GetApplications`),
 * which explicitly blanks `Token` before returning (`app.Token = ""`).
 *
 * **The usable application token is shown exactly once** — in
 * `application-create`'s response, the instant it is minted. What this
 * action and Gotify's own DB store afterwards is a public-key form the
 * server uses to *recognize* the token, not a credential that can send a
 * message (`auth/token.go`, `GenerateApplicationToken`) — so there is
 * nothing secret to protect here, and no way to recover a lost token short
 * of creating a new application.
 */
const action: ActionDefinition = {
  key: "application-list",
  type: "read",
  resource: "application",
  title: "List applications",
  description: "List the applications (message senders) on this account.",
  params: [],
  output: [
    { key: "id", type: "number", label: "Application ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "token", type: "string", label: "Token" },
    { key: "internal", type: "boolean", label: "Internal" },
    { key: "defaultPriority", type: "number", label: "Default priority" },
    { key: "image", type: "string", label: "Image path" },
    { key: "lastUsed", type: "string", label: "Last used" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "listing Gotify applications");
    return await new GotifyClient(ctx).request("/application");
  },
};

export default action;
