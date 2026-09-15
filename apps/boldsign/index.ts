/**
 * BoldSign — e-signature via the REST API (`https://api.boldsign.com/v1`, or
 * a regional sibling — see `lib/client.ts`).
 *
 * Covers the agreement lifecycle a workflow drives against files already
 * reachable at a URL: send them out for signature, list and inspect status,
 * download the signed PDF and its audit trail, nudge pending signers, revoke
 * a document, and mint an embedded signing link. Template actions cover
 * listing templates, reading a template's roles, and sending a document by
 * filling those roles with real signers.
 *
 * Deliberately absent:
 *
 *   - **A direct file upload.** BoldSign's `POST /document/send` accepts a
 *     multipart file OR a `fileUrls` list of public URLs it fetches itself.
 *     This pack's Actions run in a sandbox whose `ctx.fetch` stringifies
 *     every request body on its way to the network, so a real multipart body
 *     cannot survive the trip — only `fileUrls` is reachable here. See
 *     `actions/document-send.ts`.
 *   - **OAuth2 (authorization-code + PKCE).** BoldSign documents a full
 *     browser-consent flow against `account.boldsign.com/connect/authorize`.
 *     This app implements the simpler API Key method only (`X-API-KEY`,
 *     `authentication/api-key`) — a deliberate scoping choice, not a missing
 *     capability: API Key is what every action here needs, with one connect
 *     step and no redirect URI to register. See `auth/api-key.ts`.
 *   - **Contact groups, custom fields, brands, teams, users, sender
 *     identities and identity verification.** Each is a separate account/admin
 *     surface with its own configuration, not a document-workflow step —
 *     the same reasoning this pack's `signnow` and `docusign` apps apply to
 *     their own admin surfaces.
 *   - **Signature field placement (`FormField` bounds/coordinates).** Left to
 *     BoldSign's own editor and template designer, exactly as `signnow` and
 *     `docusign` leave it in this pack.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import documentSend from "./actions/document-send.ts";
import documentList from "./actions/document-list.ts";
import documentProperties from "./actions/document-properties.ts";
import documentDownload from "./actions/document-download.ts";
import documentDownloadAuditLog from "./actions/document-download-audit-log.ts";
import documentRemind from "./actions/document-remind.ts";
import documentRevoke from "./actions/document-revoke.ts";
import documentGetEmbeddedSignLink from "./actions/document-get-embedded-sign-link.ts";
import templateList from "./actions/template-list.ts";
import templateProperties from "./actions/template-properties.ts";
import templateSend from "./actions/template-send.ts";
import planApiCredits from "./actions/plan-api-credits.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // document
    documentSend,
    documentList,
    documentProperties,
    documentDownload,
    documentDownloadAuditLog,
    documentRemind,
    documentRevoke,
    documentGetEmbeddedSignLink,
    // template
    templateList,
    templateProperties,
    templateSend,
    // account
    planApiCredits,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
