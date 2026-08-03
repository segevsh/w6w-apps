/**
 * Docusign — eSignature via the REST API v2.1
 * (`{base_uri}/restapi/v2.1/accounts/{accountId}`).
 *
 * Covers the agreement lifecycle a workflow actually drives: build an envelope
 * (from files or from a template), send it, watch its status, read what
 * recipients typed, download the signed PDF or the certificate of completion,
 * and void it when the deal dies — plus the template, recipient and user reads
 * that feed those steps, and the embedded-signing URL for in-app signing.
 *
 * **The one thing to know before wiring this up:** Docusign has no single API
 * host. Each account is pinned to a region — `na4.docusign.net`,
 * `eu.docusign.net`, `demo.docusign.net`, … — and the correct host plus the
 * account's GUID are discovered after sign-in by calling `GET /oauth/userinfo`
 * on the *authentication* server. This app does that once, in the auth method's
 * `afterConnect`, and records both on the Connection; every action composes its
 * URL from there. See `lib/client.ts` for the full reasoning, and `auth/` for
 * why production and the developer sandbox are two separate auth methods rather
 * than one with an environment switch.
 *
 * Deliberately absent:
 *
 *   - **Docusign Connect (webhooks).** Registering a callback URL is a
 *     Trigger's `onSubscribe`, not an Action — an Action that registers a URL
 *     the workflow engine did not mint leaves an orphan subscription pointing
 *     at nothing. This matters more here than usual: Docusign's own rate-limit
 *     guidance says to use Connect rather than polling for envelope status, so
 *     the gap is named rather than papered over with a polling action that
 *     encourages the pattern Docusign asks you to avoid.
 *   - **Envelope authoring internals** — tabs, custom fields, document
 *     visibility, attachments, locks, workflow steps and delayed routing. These
 *     edit the *inside* of an envelope, which is what Docusign's own editor and
 *     template designer are for; this app runs agreements through a workflow
 *     rather than composing them. What a workflow does need is reachable: tabs
 *     travel inline in `envelope-create`'s recipients JSON, and their filled
 *     values come back from `envelope-form-data-get`.
 *   - **Bulk send, PowerForms, signing groups, brands, notary and payments** —
 *     each is a product feature with its own configuration surface, not a step.
 *   - **User, group and permission administration** — operator concerns.
 *     `user-list` is kept because a `userId` is an input other actions need.
 *   - **JWT Grant (impersonation) and the Implicit Grant.** JWT is Docusign's
 *     answer for unattended service integrations and would be a legitimate
 *     third auth method, but it needs an RSA keypair, one-time admin consent
 *     and a `sign` hook that mints and signs a JWT per request — a materially
 *     different flow, not implemented on speculation. Implicit Grant is
 *     superseded by the PKCE public flow in Docusign's own guidance.
 *   - **The CLM, Rooms, Click, Maestro, Navigator, Admin and Monitor APIs.**
 *     Separate products with separate scopes and hosts; this app is eSignature.
 */
import type { AppDefinition } from "@w6w/types";

import oauth2 from "./auth/oauth2.ts";
import oauth2Demo from "./auth/oauth2-demo.ts";

import envelopeList from "./actions/envelope-list.ts";
import envelopeGet from "./actions/envelope-get.ts";
import envelopeStatusList from "./actions/envelope-status-list.ts";
import envelopeCreate from "./actions/envelope-create.ts";
import envelopeCreateFromTemplate from "./actions/envelope-create-from-template.ts";
import envelopeSend from "./actions/envelope-send.ts";
import envelopeVoid from "./actions/envelope-void.ts";
import envelopeFormDataGet from "./actions/envelope-form-data-get.ts";
import envelopeRecipientList from "./actions/envelope-recipient-list.ts";
import envelopeRecipientAdd from "./actions/envelope-recipient-add.ts";
import recipientViewCreate from "./actions/recipient-view-create.ts";
import envelopeDocumentList from "./actions/envelope-document-list.ts";
import envelopeDocumentDownload from "./actions/envelope-document-download.ts";
import templateList from "./actions/template-list.ts";
import templateGet from "./actions/template-get.ts";
import userList from "./actions/user-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // envelope
    envelopeList,
    envelopeGet,
    envelopeStatusList,
    envelopeCreate,
    envelopeCreateFromTemplate,
    envelopeSend,
    envelopeVoid,
    envelopeFormDataGet,
    // recipient
    envelopeRecipientList,
    envelopeRecipientAdd,
    recipientViewCreate,
    // document
    envelopeDocumentList,
    envelopeDocumentDownload,
    // template
    templateList,
    templateGet,
    // user
    userList,
  ],
  auth: [oauth2, oauth2Demo],
  healthChecks: [service, quota],
} satisfies AppDefinition;
