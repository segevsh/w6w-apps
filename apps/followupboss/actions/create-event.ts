import type { ActionDefinition } from "@w6w/types";
import { ACTION_PLAN_EVENT_TYPES, compact, EVENT_TYPES, FubClient } from "../lib/client.ts";

interface Input {
  type: string;
  source?: string;
  system?: string;
  message?: string;
  description?: string;
  person?: unknown;
  property?: unknown;
  propertySearch?: unknown;
  campaign?: unknown;
  pageTitle?: string;
  pageUrl?: string;
  pageReferrer?: string;
  pageDuration?: number;
  occurredAt?: string;
}

/**
 * `POST /events` — send in a lead, or an activity for one. **The** action of
 * this app.
 *
 * ## Why this and not Create Person
 *
 * The endpoint documentation is unusually direct: "This endpoint is the **only**
 * correct option to send leads and their activity to Follow Up Boss from an IDX
 * website, real estate portal, your custom website, or any other lead source."
 * The `POST /people` page says the same thing from the other side, listing what
 * you lose by using it instead — de-duplication, contact history, agent
 * notification, action plans, lead-flow assignment and social-profile lookup.
 *
 * An event both *creates or updates the person* and *records what they did*. It
 * is the lead pipe, and everything else in this app is downstream of it.
 *
 * ## Event type decides whether anything actually happens
 *
 * The single highest-consequence field, and the failure is silent — the call
 * succeeds either way. From the endpoint's own warning:
 *
 *   > "New leads created by POST `/v1/events` will only trigger **action plans**
 *   > if they are of the following types: `Registration`, `Seller Inquiry`,
 *   > `Property Inquiry`, `General Inquiry` or `Visited Open House`.
 *   > **Automations** will only be triggered on `Registration`, `Property
 *   > Inquiry`, `Seller Inquiry`, and `General Inquiry` types."
 *
 * So `Viewed Property` records history and runs nothing; `Property Inquiry` runs
 * the follow-up machine. The option list marks which is which.
 *
 * `Inquiry` is a convenience alias, and the docs explain how it resolves: "it
 * will be automatically converted into 'Property Inquiry' if property section is
 * included in the request or 'General Inquiry' otherwise."
 *
 * ## De-duplication is automatic, and an id makes it exact
 *
 * "Follow Up Boss will automatically de-duplicate people based on their phone
 * number or email" — so a repeat inquiry from the same person updates the
 * existing contact rather than creating a second one. That is also why this
 * action is `idempotent: false`: the *person* converges, but each call appends
 * another event to their timeline, which is the intended behaviour and not
 * something to retry blindly.
 *
 * The docs add that supplying `person.id` "will ensure that an existing contact
 * is used to link to the event based on a direct match instead of name and
 * email... this can help prevent duplicate and/or new contacts being created."
 *
 * ## A 204 is a success, and it means something specific
 *
 * "If you receive a `204` response with no response body, this indicates that
 * the lead flow associated with this source has been archived and ignored." The
 * client returns `undefined` rather than throwing, so a workflow can tell that
 * apart from a transport failure — but it is worth knowing that a silent 204
 * means the lead went nowhere, and the fix is in the account's Lead Flow screen,
 * not in the request.
 *
 * ## Historical events do not fire workflows
 *
 * `occurredAt` "is used to determine if the event is historical. Historical
 * events will not trigger workflows upon creation." Correct for a backfill,
 * wrong for anything live — so it is an advanced param with that stated.
 */
const createEvent: ActionDefinition<Input> = {
  key: "create-event",
  type: "perform",
  resource: "event",
  title: "Create Event (Send Lead)",
  idempotent: false,
  description:
    "Send a lead or lead activity into Follow Up Boss. This is the correct way to bring leads in " +
    "from a website, IDX portal or lead provider — it de-duplicates against existing contacts, " +
    "records the event in contact history, notifies and assigns the agent, and fires action " +
    "plans. Use Create Person only for administrative adds that should trigger nothing.",
  params: [
    {
      key: "type",
      label: "Event type",
      type: "select",
      required: true,
      options: EVENT_TYPES.map((value) => ({
        value,
        label: (ACTION_PLAN_EVENT_TYPES as readonly string[]).includes(value)
          ? `${value} — triggers action plans`
          : value,
      })),
      hint:
        "Decides whether follow-up automation runs at all, and the call succeeds either way — so " +
        "picking the wrong one fails silently. Action plans fire only on Registration, Seller " +
        "Inquiry, Property Inquiry, General Inquiry and Visited Open House; Automations fire on " +
        "all of those except Visited Open House. `Inquiry` is an alias that resolves to Property " +
        "Inquiry when a property is attached, and General Inquiry otherwise.",
    },
    {
      key: "source",
      label: "Source",
      type: "string",
      hint: "The brand or marketing name of the lead source, e.g. `Zillow` — what the broker " +
        "calls it. Drives Lead Flow routing.",
    },
    {
      key: "person",
      label: "Person",
      type: "json",
      hint: 'The lead. JSON object, e.g. `{"firstName": "John", "lastName": "Smith", ' +
        '"emails": [{"value": "john@example.com"}], "phones": [{"value": "555-555-5555"}]}`. ' +
        "Follow Up Boss de-duplicates on email or phone automatically; include `id` when you " +
        "already know the contact, for an exact match instead of a heuristic one. Custom fields " +
        "go in here as prefixed keys, e.g. `customBirthday`.",
    },
    {
      key: "message",
      label: "Message",
      type: "text",
      hint: "What the person said — the body of their inquiry.",
    },
    {
      key: "property",
      label: "Property",
      type: "json",
      hint: 'The property this event concerns. JSON object: `{"street": "...", "city": "...", ' +
        '"state": "CA", "code": "90068", "mlsNumber": "...", "price": 310000, "forRent": false, ' +
        '"url": "..."}`. Note `code` (zip) must be a **string**, not a number. Attaching this ' +
        "also turns a bare `Inquiry` type into a Property Inquiry.",
    },
    {
      key: "system",
      label: "System",
      type: "string",
      advanced: true,
      hint: "The software that produced the lead, as distinct from Source — Source is the brand " +
        "the broker markets under, System is the platform. Unrelated to the `X-System` header on " +
        "the Connection.",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      advanced: true,
      hint: 'Extra context, e.g. "Move-in: 12/28/2026".',
    },
    {
      key: "propertySearch",
      label: "Property search",
      type: "json",
      advanced: true,
      hint: "JSON object describing what the person was searching for, when the event is a search.",
    },
    {
      key: "campaign",
      label: "Campaign",
      type: "json",
      advanced: true,
      hint: "JSON object describing where the visit originated (source, medium, term, content).",
    },
    {
      key: "pageUrl",
      label: "Page URL",
      type: "string",
      advanced: true,
      hint: "For `Viewed Page` events — the URL viewed.",
    },
    {
      key: "pageTitle",
      label: "Page title",
      type: "string",
      advanced: true,
      hint: 'For `Viewed Page` events — the page title, e.g. "Contact Us".',
    },
    {
      key: "pageReferrer",
      label: "Page referrer",
      type: "string",
      advanced: true,
      hint: "For `Viewed Page` events — the referring URL.",
    },
    {
      key: "pageDuration",
      label: "Page duration (seconds)",
      type: "number",
      advanced: true,
      hint: "For `Viewed Page` events — seconds spent on the page.",
    },
    {
      key: "occurredAt",
      label: "Occurred at",
      type: "string",
      advanced: true,
      hint: "When the event happened, ISO-8601 UTC. Setting it in the past marks the event " +
        "**historical**, and historical events deliberately do not trigger workflows. Leave it " +
        "empty for anything live.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Event id" },
    { key: "personId", type: "number", label: "Person the event was attached to" },
  ],

  execute(input, ctx) {
    return new FubClient(ctx).request("/events", {
      method: "POST",
      body: compact({
        type: input.type,
        source: input.source,
        system: input.system,
        message: input.message,
        description: input.description,
        person: input.person,
        property: input.property,
        propertySearch: input.propertySearch,
        campaign: input.campaign,
        pageTitle: input.pageTitle,
        pageUrl: input.pageUrl,
        pageReferrer: input.pageReferrer,
        pageDuration: input.pageDuration,
        occurredAt: input.occurredAt,
      }),
    });
  },
};

export default createEvent;
