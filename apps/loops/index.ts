/**
 * Loops — transactional email, events that trigger workflows, and the contacts
 * both of them act on.
 *
 * Every path, parameter, required body field and response shape was taken from
 * the OpenAPI 3.1 document Loops serves from its own app host
 * (`https://app.loops.so/openapi.json`, "Loops OpenAPI Spec" v1.21.7, fetched
 * 2026-08-18), and the auth and error behaviour was measured against
 * `app.loops.so` the same day.
 *
 * ## The shape of the product, which is the shape of the app
 *
 * Loops keeps the **email body** and the **audience logic** in Loops. A
 * workflow supplies an address, some variables and an event name; the template
 * that renders and the loop that fires are built and versioned in the Loops
 * editor. There is no "send this HTML" endpoint, and that is deliberate on
 * their part rather than a gap in this app.
 *
 * ## Four things that go wrong quietly
 *
 *   - **Create fails on an existing contact; update upserts.** `contact-create`
 *     answers `409` for a known email, which turns a perfectly normal re-run of
 *     a signup workflow into a failed step. `contact-update` is the one that
 *     creates-or-updates, and it is what most workflows actually want.
 *   - **Changing an email address needs a `userId`.** Loops' own note says so.
 *     Keyed by email alone, a new address is not a rename — Loops creates a
 *     second contact and the first stays behind, still subscribed. This app
 *     refuses that combination rather than forking the record.
 *   - **A template must be published before it can be sent.** An unpublished
 *     transactional email has an id and reads back fine, then answers `404` on
 *     send, which looks like a wrong id. `transactional-publish` is the missing
 *     step, and `transactional-list` can show only the sendable ones.
 *   - **`mailingLists` is an object, not an array.** Loops takes
 *     `{listId: true | false}` — true adds, false removes. An array of ids is
 *     ignored rather than rejected, so a "subscribe" that changes nothing looks
 *     like a success. This app accepts the friendly comma-separated form and
 *     converts, and passes a JSON object through so removals stay expressible.
 *
 * ## Retries that do not send twice
 *
 * The two sending endpoints accept an `Idempotency-Key` header — the spec calls
 * it *"a unique ID for this request (maximum 100 characters) to avoid duplicate
 * emails"* — and refuse a reused key whose body differs, with a `409`. That
 * second half is what makes it trustworthy rather than merely convenient. Both
 * `transactional-send` and `event-send` can derive the key from the step's
 * invocation id, which is stable across a retry and different for the next
 * step. Both declare `idempotent: false`, because without that opt-in they are
 * not.
 *
 * Deliberately out of scope:
 *   - **Building emails, workflows and campaigns.** The API can create workflow
 *     nodes, themes, components and campaign drafts; that is authoring a design
 *     tool through a workflow step, and the editor is where it belongs. This
 *     app reads them and sends them.
 *   - **Asset uploads.** `POST /v1/uploads` is a two-step signed-URL flow for
 *     images in the editor, which needs a second host and a byte stream the
 *     sandbox has no way to produce.
 *   - **Dedicated sending IPs** — an infrastructure setting, not a workflow.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import transactionalSend from "./actions/transactional-send.ts";
import transactionalList from "./actions/transactional-list.ts";
import transactionalGet from "./actions/transactional-get.ts";
import transactionalPublish from "./actions/transactional-publish.ts";
import eventSend from "./actions/event-send.ts";
import eventPatternList from "./actions/event-pattern-list.ts";
import eventPatternGet from "./actions/event-pattern-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactFind from "./actions/contact-find.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactPropertyList from "./actions/contact-property-list.ts";
import contactPropertyCreate from "./actions/contact-property-create.ts";
import contactSuppressionGet from "./actions/contact-suppression-get.ts";
import contactSuppressionRemove from "./actions/contact-suppression-remove.ts";
import mailingListList from "./actions/mailing-list-list.ts";
import audienceSegmentList from "./actions/audience-segment-list.ts";
import campaignList from "./actions/campaign-list.ts";
import campaignGet from "./actions/campaign-get.ts";
import workflowList from "./actions/workflow-list.ts";
import workflowGet from "./actions/workflow-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // sending — the reason the app exists
    transactionalSend,
    eventSend,
    // the templates a send names
    transactionalList,
    transactionalGet,
    transactionalPublish,
    // the events a workflow trigger listens for
    eventPatternList,
    eventPatternGet,
    // contacts
    contactCreate,
    contactUpdate,
    contactFind,
    contactDelete,
    contactPropertyList,
    contactPropertyCreate,
    contactSuppressionGet,
    contactSuppressionRemove,
    // audience
    mailingListList,
    audienceSegmentList,
    // campaigns and workflows, read-only
    campaignList,
    campaignGet,
    workflowList,
    workflowGet,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
