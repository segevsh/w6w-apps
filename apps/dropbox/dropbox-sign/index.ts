/**
 * Dropbox Sign — send documents for signature, track them to completion, and
 * manage the templates and teams around them.
 *
 * Every path, parameter, required body field and response shape was taken from
 * the **official** OpenAPI document (`github.com/hellosign/hellosign-openapi`,
 * described by its own repository as "Official Dropbox Sign OpenAPI Spec";
 * `openapi.yaml` fetched 2026-08-18), and the places where that document
 * disagrees with the running API were settled by probing the API — each one is
 * recorded where it matters.
 *
 * **The name.** The product was renamed from HelloSign to Dropbox Sign; the API
 * was not. `api.hellosign.com` is the live host and `api.sign.dropbox.com` does
 * not resolve, measured 2026-08-18.
 *
 * ## Three things about this API that go wrong quietly
 *
 * Each produces a plausible result rather than an error, which is why each is
 * handled here rather than left to the workflow author.
 *
 *   - **Test mode decides whether a signature is legally binding, and it
 *     defaults to off.** `test_mode: false` — the API's own default, which this
 *     app keeps — means the request emails real people, consumes plan quota and
 *     produces a signature with legal standing. Flipping the default to "safe"
 *     would be the worse surprise: a workflow that looks like it is sending
 *     contracts would quietly send nothing binding. So every action that
 *     creates a request carries the same explicit parameter, labelled with what
 *     the default *does*.
 *   - **A 200 can carry warnings.** Twenty-eight response schemas in the
 *     document have a `warnings[]` array — an ignored field, a signer who has
 *     already signed. A caller that only checks for an exception never sees
 *     them. The send actions return the array and log it.
 *   - **`signature_id` is not `signature_request_id`.** The request has one id;
 *     each signer inside it has another, and they look alike. The endpoints
 *     that take the signer's id (`signature-request-update`,
 *     `embedded-sign-url-get`) say so in the parameter hint, because passing
 *     the wrong one fails with an error about the signature rather than about
 *     the id.
 *
 * ## Two verbs that are not the same verb
 *
 * `signature-request-cancel` stops an **incomplete** request; the request stays
 * in the account. `signature-request-remove` permanently removes access to a
 * **completed** one, including its files, and cannot be undone — so it requires
 * an explicit confirmation flag on top of the id.
 *
 * ## Documents go in by URL
 *
 * Every send endpoint accepts either JSON with `file_urls` or multipart with
 * `files`. This app sends JSON. An App runs in a sandbox whose only outbound
 * reach is `ctx.fetch` to an allowlisted host — it has no local file to attach
 * and no business reading one — so Dropbox Sign fetches the document itself.
 * Documents come **out** as a short-lived link or a data URI, never as a raw
 * byte stream, for the same reason.
 *
 * Deliberately out of scope:
 *   - **Fax.** `/fax/*` and `/fax_line/*` are a separate product needing a
 *     purchased fax line, with its own billing and its own components on the
 *     status page. This app is about signatures.
 *   - **API App management.** Creating and deleting API Apps is account
 *     administration, not workflow, and it is the one scope this app's OAuth
 *     method does not request.
 *   - **Team creation and membership changes.** Reading a team is useful for
 *     resolving account ids; restructuring one from a workflow is not what this
 *     integration is for.
 *   - **Bulk send.** The bulk *jobs* are readable, but starting one takes a CSV
 *     upload, which is the multipart path this app does not use.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import oauth2 from "./auth/oauth2.ts";

import signatureRequestSend from "./actions/signature-request-send.ts";
import signatureRequestSendWithTemplate from "./actions/signature-request-send-with-template.ts";
import signatureRequestGet from "./actions/signature-request-get.ts";
import signatureRequestList from "./actions/signature-request-list.ts";
import signatureRequestCancel from "./actions/signature-request-cancel.ts";
import signatureRequestRemove from "./actions/signature-request-remove.ts";
import signatureRequestRemind from "./actions/signature-request-remind.ts";
import signatureRequestUpdate from "./actions/signature-request-update.ts";
import signatureRequestReleaseHold from "./actions/signature-request-release-hold.ts";
import signatureRequestFilesGet from "./actions/signature-request-files-get.ts";
import templateList from "./actions/template-list.ts";
import templateGet from "./actions/template-get.ts";
import templateDelete from "./actions/template-delete.ts";
import templateAddUser from "./actions/template-add-user.ts";
import templateRemoveUser from "./actions/template-remove-user.ts";
import templateFilesGet from "./actions/template-files-get.ts";
import embeddedSignUrlGet from "./actions/embedded-sign-url-get.ts";
import embeddedEditUrlGet from "./actions/embedded-edit-url-get.ts";
import unclaimedDraftCreate from "./actions/unclaimed-draft-create.ts";
import accountGet from "./actions/account-get.ts";
import accountUpdate from "./actions/account-update.ts";
import teamGet from "./actions/team-get.ts";
import teamMembersList from "./actions/team-members-list.ts";
import teamInvitesList from "./actions/team-invites-list.ts";
import bulkSendJobList from "./actions/bulk-send-job-list.ts";
import bulkSendJobGet from "./actions/bulk-send-job-get.ts";
import reportCreate from "./actions/report-create.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // signature requests — the reason the app exists
    signatureRequestSend,
    signatureRequestSendWithTemplate,
    signatureRequestGet,
    signatureRequestList,
    signatureRequestCancel,
    signatureRequestRemove,
    signatureRequestRemind,
    signatureRequestUpdate,
    signatureRequestReleaseHold,
    signatureRequestFilesGet,
    // templates
    templateList,
    templateGet,
    templateDelete,
    templateAddUser,
    templateRemoveUser,
    templateFilesGet,
    // embedded
    embeddedSignUrlGet,
    embeddedEditUrlGet,
    unclaimedDraftCreate,
    // account and team
    accountGet,
    accountUpdate,
    teamGet,
    teamMembersList,
    teamInvitesList,
    // bulk sends and reporting
    bulkSendJobList,
    bulkSendJobGet,
    reportCreate,
  ],
  auth: [apiKey, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
