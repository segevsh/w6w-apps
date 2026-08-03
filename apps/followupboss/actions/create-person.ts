import type { ActionDefinition } from "@w6w/types";
import {
  ADDRESSES_PARAM,
  CUSTOM_FIELDS_PARAM,
  EMAILS_PARAM,
  FubClient,
  PHONES_PARAM,
  withCustomFields,
} from "../lib/client.ts";

interface Input {
  firstName?: string;
  lastName?: string;
  stage?: string;
  source?: string;
  sourceUrl?: string;
  contacted?: boolean;
  price?: number;
  assignedTo?: string;
  assignedUserId?: number;
  assignedPondId?: number;
  assignedLenderName?: string;
  assignedLenderId?: number;
  emails?: unknown;
  phones?: unknown;
  addresses?: unknown;
  tags?: string[];
  background?: string;
  collaborators?: number[];
  timeframeId?: number;
  createdAt?: string;
  deduplicate?: boolean;
  customFields?: unknown;
}

/**
 * `POST /people` — create a contact directly.
 *
 * ## Read this before using it: for a LEAD, use Create Event instead
 *
 * The endpoint's own documentation opens with a red warning, and it is not a
 * style note — it describes silently losing most of the product's behaviour:
 *
 *   > "Do not use `POST /v1/people` to send leads into Follow Up Boss. This will
 *   > only create the person and **will not** run any automations."
 *
 * It then lists what `POST /events` does that this does not: de-duplicates
 * against existing contacts, records the inquiry in contact history and the
 * dashboard, notifies the agent by email/text, applies action plans, assigns the
 * correct agent per the Lead Flow screen, and searches for social profiles.
 *
 * So the split is: **Create Event for anything originating outside Follow Up
 * Boss** (a website form, an IDX portal, a lead provider), **Create Person only
 * for a contact you are administratively adding** — importing a back-office
 * list, say, where no lead workflow should fire. The description says so at the
 * form, because by the time someone notices no action plans ran, they have a
 * week of leads that did not get followed up.
 *
 * ## `source` and `sourceUrl` are write-once
 *
 * "The `source` and `sourceUrl` fields can only be set once on the creation of a
 * person. This **cannot** be changed via the PUT request." They are therefore
 * offered here and deliberately absent from Update Person.
 *
 * ## `deduplicate` is off by default
 *
 * "By default new people will be created even if there are existing people with
 * the same email or phone. By passing true, deduplication logic will be used."
 * It is a query parameter, not a body field — one of the two things about this
 * endpoint that are easy to get subtly wrong (the other being `customFields`,
 * which merge in as flat top-level keys).
 */
const createPerson: ActionDefinition<Input> = {
  key: "create-person",
  type: "perform",
  resource: "person",
  title: "Create Person",
  idempotent: false,
  description:
    "Add a contact directly. NOT the way to send in a lead — POST /people runs no automations, " +
    "action plans, agent notifications or lead-flow assignment. Use Create Event for anything " +
    "arriving from a website, portal or lead provider; use this only for administrative adds.",
  params: [
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    EMAILS_PARAM,
    PHONES_PARAM,
    {
      key: "stage",
      label: "Stage",
      type: "string",
      hint: 'e.g. "Lead". List the account\'s stages with the List Stages action.',
    },
    {
      key: "source",
      label: "Source",
      type: "string",
      hint: "The lead source. **Write-once** — it cannot be changed later, by this API or the PUT.",
    },
    {
      key: "sourceUrl",
      label: "Source URL",
      type: "string",
      hint: "Direct link to this person at the lead provider. Also **write-once**.",
    },
    {
      key: "assignedUserId",
      label: "Assigned user id",
      type: "number",
      hint: "Agent to assign. Ids come from the List Users action.",
    },
    {
      key: "assignedTo",
      label: "Assigned to (name)",
      type: "string",
      advanced: true,
      hint: "Full name of the agent. Prefer the id where you have it.",
    },
    {
      key: "assignedPondId",
      label: "Assigned pond id",
      type: "number",
      advanced: true,
      hint: "Pond to drop the contact into instead of assigning an agent.",
    },
    {
      key: "assignedLenderId",
      label: "Assigned lender id",
      type: "number",
      advanced: true,
    },
    {
      key: "assignedLenderName",
      label: "Assigned lender name",
      type: "string",
      advanced: true,
    },
    {
      key: "price",
      label: "Price",
      type: "number",
      advanced: true,
      hint: "Estimated buy/sell price, or the price of the property in their first inquiry.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      item: { type: "string" },
      advanced: true,
      hint: "Tags to apply. Follow Up Boss also uses a `Seller` tag to mark seller leads — its " +
        "absence is what makes a lead a buyer.",
    },
    {
      key: "background",
      label: "Background",
      type: "text",
      advanced: true,
      hint: "Free-text background on the person. Multi-line is fine.",
    },
    {
      key: "collaborators",
      label: "Collaborator user ids",
      type: "array",
      item: { type: "number" },
      advanced: true,
      hint: "User ids to set as collaborators. This is a **replace**, not an append: omitting an " +
        "existing collaborator's id removes them.",
    },
    {
      key: "contacted",
      label: "Contacted",
      type: "boolean",
      advanced: true,
      hint: "Mark as already contacted.",
    },
    ADDRESSES_PARAM,
    {
      key: "timeframeId",
      label: "Timeframe id",
      type: "number",
      advanced: true,
      hint: "Buying/selling timeframe. Ids come from the `/timeframes` endpoint.",
    },
    {
      key: "createdAt",
      label: "Created at",
      type: "string",
      advanced: true,
      hint: "Backdate the record, for importing historical leads. ISO-8601 UTC.",
    },
    {
      key: "deduplicate",
      label: "Deduplicate",
      type: "boolean",
      advanced: true,
      hint:
        "**Off by default** — without it, a person with an existing email or phone is created " +
        "again as a duplicate. Turn it on to match against existing contacts instead. Sent as a " +
        "query parameter, not part of the body.",
    },
    CUSTOM_FIELDS_PARAM,
  ],
  output: [{ key: "id", type: "number", label: "Person id" }],

  execute(input, ctx) {
    const body = withCustomFields({
      firstName: input.firstName,
      lastName: input.lastName,
      stage: input.stage,
      source: input.source,
      sourceUrl: input.sourceUrl,
      contacted: input.contacted,
      price: input.price,
      assignedTo: input.assignedTo,
      assignedUserId: input.assignedUserId,
      assignedPondId: input.assignedPondId,
      assignedLenderName: input.assignedLenderName,
      assignedLenderId: input.assignedLenderId,
      emails: input.emails,
      phones: input.phones,
      addresses: input.addresses,
      tags: input.tags,
      background: input.background,
      collaborators: input.collaborators,
      timeframeId: input.timeframeId,
      createdAt: input.createdAt,
    }, input.customFields);

    return new FubClient(ctx).request("/people", {
      method: "POST",
      query: { deduplicate: input.deduplicate },
      body,
    });
  },
};

export default createPerson;
