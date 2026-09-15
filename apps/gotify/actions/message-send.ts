import type { ActionDefinition } from "@w6w/types";
import { compact, GotifyClient, json, num } from "../lib/client.ts";

/**
 * `POST /message` — verified against Gotify's OpenAPI document (`createMessage`)
 * and its handler (`api/message.go`, `CreateMessage`).
 *
 * **`applicationId` is required for a client token, and ignored for an
 * application token.** The handler's own doc comment says so: *"When
 * authenticating with a client token or basic auth, the request body must
 * include `appid` referencing an application owned by the authenticated
 * user. When authenticating with an application token, the application is
 * derived from the token and any `appid` in the body is ignored."* Since this
 * app's Connection is always a client token (see `auth/token.ts`),
 * `applicationId` is required here — a client token with no `appid` gets a
 * `400 "appid is required when not authenticating with an application
 * token"`, and pointing that at the app itself lets a workflow author fix it
 * from the params list rather than a raw API error.
 *
 * `title` defaults to the application's own name and `priority` to the
 * application's `defaultPriority` when left unset — that fallback is Gotify's,
 * not this app's, so it is left to the server rather than reproduced here.
 */
const action: ActionDefinition = {
  key: "message-send",
  type: "perform",
  resource: "message",
  title: "Send message",
  description: "Push a notification through Gotify.",
  idempotent: false,
  params: [
    {
      key: "applicationId",
      label: "Application ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "From `application-list` — the application this message is sent as.",
    },
    { key: "message", label: "Message", type: "text", required: true },
    {
      key: "title",
      label: "Title",
      type: "string",
      hint: "Blank falls back to the application's own name.",
    },
    {
      key: "priority",
      label: "Priority",
      type: "number",
      validation: { integer: true, min: 0, max: 10 },
      hint: "Gotify has no fixed scale, but its own clients treat 0-3 as min, 4-7 as normal " +
        "and 8-10 as max/urgent. Blank falls back to the application's default priority.",
    },
    {
      key: "extras",
      label: "Extras",
      type: "json",
      hint: 'Vendor-specific display/formatting data, e.g. {"client::display":{"contentType":' +
        '"text/markdown"}}. Keys under the gotify/android/ios/web/server/client namespaces ' +
        "are reserved.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Message ID" },
    { key: "appid", type: "number", label: "Application ID" },
    { key: "message", type: "string", label: "Message" },
    { key: "title", type: "string", label: "Title" },
    { key: "priority", type: "number", label: "Priority" },
    { key: "date", type: "string", label: "Sent at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const message = String(p.message ?? "").trim();
    if (!message) throw new Error("`message` is required");

    ctx.log("info", "sending Gotify message", { applicationId: p.applicationId });

    return await new GotifyClient(ctx).request("/message", {
      method: "POST",
      body: compact({
        appid: Number(p.applicationId),
        message,
        title: p.title,
        priority: num(p.priority),
        extras: json(p.extras, "extras"),
      }),
    });
  },
};

export default action;
