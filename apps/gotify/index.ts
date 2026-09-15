/**
 * Gotify — send and manage push notifications on a self-hosted server
 * (https://gotify.net).
 *
 * Every path, parameter, required body field, security requirement and
 * response shape here was taken from the OpenAPI (Swagger 2.0) document the
 * project publishes at `docs/spec.json` in `gotify/server`
 * (https://raw.githubusercontent.com/gotify/server/master/docs/spec.json,
 * fetched 2026-09-15, `info.version: "2.1.0"`), cross-checked against the
 * handler source in the same repo (`api/*.go`) and its router
 * (`router/router.go`) for the auth and partial-update behaviour the spec
 * document alone doesn't state.
 *
 * ## There is no vendor host
 *
 * Gotify is self-hosted by design — there is no shared `api.gotify.net`, only
 * whichever instance an operator runs. So the base URL is a connection field
 * and the egress allowlist is `["*"]`, the posture this pack already uses for
 * `gitea`, `mautic`, `tableau` and `bubble`.
 *
 * ## Two token types, and the app asks for the narrower-sounding one
 *
 * Gotify issues **application tokens** (send-only) and **client tokens**
 * (read, manage, and — per the spec's own `createMessage` security list —
 * send too). This app's single Auth method asks for a client token
 * specifically, because it is the only one that can drive every action here;
 * see `auth/token.ts` for the header choice and the trap of pasting an
 * application token in by mistake.
 *
 * ## Two endpoints that are gated behind more than a valid token
 *
 * `DELETE /application/{id}` and `DELETE /client/{id}` require a freshly
 * *elevated* client session — a WebAuthn re-authentication ceremony a stored
 * API credential cannot perform (`router/router.go`'s `RequireElevatedClient`,
 * `auth/authentication.go`'s `checkClientElevated`). A plain client token,
 * however new or fully-privileged, 403s on both with `"session not
 * elevated"`. That is not visible anywhere in the spec document's `security`
 * lists — it is enforced in code, one layer below what Swagger describes —
 * which is exactly the kind of thing worth reading the handler source for
 * rather than trusting the spec alone. Both actions are left out rather than
 * shipped to fail; see `auth/token.ts` for the full explanation and the
 * escape hatch (basic auth) this app deliberately does not offer instead.
 *
 * ## `appid` is required with a client token, and ignored with an app token
 *
 * `POST /message`'s own doc comment states this explicitly
 * (`api/message.go`): a client-token request without `appid` gets a
 * `400 "appid is required when not authenticating with an application
 * token"`. Since this app's Connection is always a client token,
 * `message-send`'s `applicationId` parameter is required.
 *
 * ## A list token is not a secret
 *
 * `application-list` and `client-list` return every application/client the
 * account owns, but Gotify's newer token scheme mints a public/private
 * ed25519 keypair and only ever returns the **private** (usable) half once,
 * at creation — `GetApplications`/`GetClients` explicitly blank the field
 * afterwards (`api/application.go`, `api/client.go`). Capture a token from
 * `application-create`/`client-create`'s own output; it cannot be recovered
 * from a list call.
 *
 * ## Deliberately out of scope
 *
 *   - **`application-delete` / `client-delete`.** See above.
 *   - **Application images** (`POST`/`DELETE /application/{id}/image`) — a
 *     binary upload with no clear place in a text-first param form.
 *   - **`PUT /application/{id}/security`** — configures per-connection
 *     stream token behaviour and is itself elevation-gated.
 *   - **Plugins, the WebSocket `/stream`, OIDC/local login, user
 *     administration.** Each is its own surface — a plugin's config schema is
 *     defined by the plugin, not Gotify; the stream is a long-lived
 *     WebSocket, not a request/response call; login and admin are about
 *     *operating* a Gotify instance, not sending and triaging the
 *     notifications that pass through it.
 */
import type { AppDefinition } from "@w6w/types";
import clientToken from "./auth/token.ts";

import messageSend from "./actions/message-send.ts";
import messageList from "./actions/message-list.ts";
import messageDelete from "./actions/message-delete.ts";
import messageDeleteAll from "./actions/message-delete-all.ts";
import applicationList from "./actions/application-list.ts";
import applicationCreate from "./actions/application-create.ts";
import applicationUpdate from "./actions/application-update.ts";
import clientList from "./actions/client-list.ts";
import clientCreate from "./actions/client-create.ts";
import clientUpdate from "./actions/client-update.ts";
import userGet from "./actions/user-get.ts";
import versionGet from "./actions/version-get.ts";

import instance from "./health/instance.ts";
import service from "./health/service.ts";

export default {
  actions: [
    // messages
    messageSend,
    messageList,
    messageDelete,
    messageDeleteAll,
    // applications (message senders)
    applicationList,
    applicationCreate,
    applicationUpdate,
    // clients (receivers/managers)
    clientList,
    clientCreate,
    clientUpdate,
    // who and what this is
    userGet,
    versionGet,
  ],
  auth: [clientToken],
  healthChecks: [instance, service],
} satisfies AppDefinition;
