import type { ActionDefinition } from "@w6w/types";
import { compact, GotifyClient } from "../lib/client.ts";

/**
 * `POST /application` — verified against Gotify's OpenAPI document
 * (`createApp`) and its handler (`api/application.go`, `CreateApplication`).
 *
 * **This is the only response that ever carries a usable application
 * token.** Gotify's newer token scheme is an ed25519 keypair: what gets
 * stored and returned afterwards (`application-list`, `application-update`)
 * is the public form, which identifies the application but cannot
 * authenticate as it (`auth/token.go`, `GenerateApplicationToken`). A
 * workflow that needs the token for later use — to hand to whatever will
 * call `POST /message` as this application — has to capture it from this
 * action's own output; there is no way to fetch it again afterwards, only to
 * create a new application.
 */
const action: ActionDefinition = {
  key: "application-create",
  type: "perform",
  resource: "application",
  title: "Create application",
  description: "Create an application (a message sender) and mint its token.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
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
    { key: "token", type: "string", label: "Token — shown only this once" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    ctx.log("info", "creating a Gotify application", { name });
    return await new GotifyClient(ctx).request("/application", {
      method: "POST",
      body: compact({
        name,
        description: p.description,
        defaultPriority: p.defaultPriority === undefined ? undefined : Number(p.defaultPriority),
      }),
    });
  },
};

export default action;
