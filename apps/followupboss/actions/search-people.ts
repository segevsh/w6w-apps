import type { ActionDefinition } from "@w6w/types";
import {
  FIELDS_PARAM,
  FubClient,
  type FubList,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  fields?: string;
  sort?: string;
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  stage?: string;
  source?: string;
  assignedTo?: string;
  assignedUserId?: number;
  assignedPondId?: number;
  assignedLenderId?: number;
  tags?: string;
  contacted?: boolean;
  priceAbove?: number;
  priceBelow?: number;
  smartListId?: number;
  includeTrash?: boolean;
  includeUnclaimed?: boolean;
  lastActivityAfter?: string;
  lastActivityBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}

/**
 * `GET /people` — the main contact search.
 *
 * Every filter here is declared in the endpoint's own OpenAPI document; nothing
 * is inferred. Multiple filters combine with AND, per the Searching page.
 *
 * Three behaviours are surfaced on params rather than left to be discovered:
 *
 *  1. **Trash is excluded by default.** "By default, this endpoint does not
 *     return People in the `Trash` stage. Set the `includeTrash` flag to `true`
 *     to include people that are in this stage." So a contact that seems to have
 *     vanished has usually been trashed, not deleted.
 *  2. **Not all fields come back.** `fields` is how you widen the response;
 *     `allFields` is for exploring, not for production. Adding `relationships`
 *     to it also removes the need to call `/peopleRelationships` separately.
 *  3. **Results are newest-first.** Default order is descending by id — see
 *     `PAGE_PARAMS`.
 *
 * The `sort` values are the endpoint's documented set. `createdAfter` /
 * `updatedAfter` and friends come from the Common Filters page, which applies
 * them to "the majority of our GET API endpoints"; they are the right way to
 * drive an incremental sync. The docs attach a caveat to `updated` that is worth
 * repeating: "the field is only updated when the record itself changes, but
 * related information may be stored in separate records. For example, if a note
 * is added to a contact, that note is a distinct record, so the contact's
 * updated field will not change."
 */
const searchPeople: ActionDefinition<Input> = {
  key: "search-people",
  type: "search",
  resource: "person",
  title: "Search People",
  description:
    "Search contacts by name, email, phone, stage, source, assignment, tags, price range or " +
    "smart list. Filters combine with AND. Excludes the Trash stage unless you opt in.",
  params: [
    { key: "name", label: "Name", type: "string", hint: 'Partial match — "drew" finds "Andrew".' },
    { key: "email", label: "Email", type: "string", hint: "Exact email address to look up." },
    { key: "phone", label: "Phone", type: "string", hint: "Phone number to look up." },
    {
      key: "stage",
      label: "Stage",
      type: "string",
      hint: 'Stage name, e.g. "Lead" or "Past Client". List the account\'s stages with the ' +
        "List Stages action.",
    },
    { key: "source", label: "Source", type: "string", hint: "Lead source name, e.g. `Zillow`." },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated. `Foo,Bar` matches contacts tagged Foo **OR** Bar — not both.",
    },
    {
      key: "assignedUserId",
      label: "Assigned user id",
      type: "number",
      hint: "Agent the contact is assigned to. Ids come from the List Users action.",
    },
    {
      key: "assignedTo",
      label: "Assigned to (name)",
      type: "string",
      advanced: true,
      hint:
        'Full name of the assigned agent, e.g. "William Riker". Prefer the id where you have it.',
    },
    {
      key: "assignedPondId",
      label: "Assigned pond id",
      type: "number",
      advanced: true,
      hint: "Pond the contact sits in (a shared, unassigned queue).",
    },
    {
      key: "assignedLenderId",
      label: "Assigned lender id",
      type: "number",
      advanced: true,
      hint: "Lender assigned to the contact.",
    },
    {
      key: "smartListId",
      label: "Smart list id",
      type: "number",
      advanced: true,
      hint: "Return people matching a saved Smart List. Ids come from the List Smart Lists action.",
    },
    {
      key: "contacted",
      label: "Contacted",
      type: "boolean",
      advanced: true,
      hint: "Filter by whether the contact has been contacted.",
    },
    {
      key: "priceAbove",
      label: "Price above",
      type: "number",
      advanced: true,
      hint: "People whose stated price is above this value.",
    },
    {
      key: "priceBelow",
      label: "Price below",
      type: "number",
      advanced: true,
      hint: "People whose stated price is below this value.",
    },
    {
      key: "includeTrash",
      label: "Include trashed",
      type: "boolean",
      advanced: true,
      hint: "People in the `Trash` stage are **excluded by default**. Turn this on to see them — " +
        "a contact that looks deleted is usually just trashed.",
    },
    {
      key: "includeUnclaimed",
      label: "Include unclaimed",
      type: "boolean",
      advanced: true,
      hint: "Include unclaimed leads offered to the current user.",
    },
    {
      key: "id",
      label: "Ids",
      type: "string",
      advanced: true,
      hint: 'One or more person ids, comma separated — e.g. "123,456".',
    },
    {
      key: "firstName",
      label: "First name",
      type: "string",
      advanced: true,
      hint: "Partial match on the first name.",
    },
    {
      key: "lastName",
      label: "Last name",
      type: "string",
      advanced: true,
      hint: "Partial match on the last name.",
    },
    {
      key: "createdAfter",
      label: "Created after",
      type: "string",
      advanced: true,
      hint: "ISO-8601 UTC, e.g. `2026-07-01T04:00:00Z`.",
    },
    {
      key: "createdBefore",
      label: "Created before",
      type: "string",
      advanced: true,
      hint: "ISO-8601 UTC.",
    },
    {
      key: "updatedAfter",
      label: "Updated after",
      type: "string",
      advanced: true,
      hint: "ISO-8601 UTC. The usual driver for an incremental sync — but note `updated` only " +
        "moves when the person record itself changes. Adding a note creates a separate record " +
        "and leaves the contact's `updated` untouched.",
    },
    {
      key: "updatedBefore",
      label: "Updated before",
      type: "string",
      advanced: true,
      hint: "ISO-8601 UTC.",
    },
    {
      key: "lastActivityAfter",
      label: "Last activity after",
      type: "string",
      advanced: true,
      hint: "Format per the docs: `2016-11-23 01:02:03`.",
    },
    {
      key: "lastActivityBefore",
      label: "Last activity before",
      type: "string",
      advanced: true,
      hint: "Format per the docs: `2016-11-23 01:02:03`.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      advanced: true,
      options: [
        { value: "id", label: "Id" },
        { value: "created", label: "Created" },
        { value: "updated", label: "Updated" },
        { value: "name", label: "Name" },
        { value: "firstName", label: "First name" },
        { value: "lastName", label: "Last name" },
        { value: "price", label: "Price" },
        { value: "stage", label: "Stage" },
        { value: "lastActivity", label: "Last activity" },
        { value: "lastCommunication", label: "Last communication" },
      ],
      hint: "Prefix with `-` for descending, e.g. `-created`. Defaults to `created`.",
    },
    { ...FIELDS_PARAM, advanced: true },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx): Promise<FubList> {
    return new FubClient(ctx).list("/people", {
      query: {
        ...pageQuery(input),
        id: input.id,
        sort: input.sort,
        fields: input.fields,
        name: input.name,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        stage: input.stage,
        source: input.source,
        assignedTo: input.assignedTo,
        assignedUserId: input.assignedUserId,
        assignedPondId: input.assignedPondId,
        assignedLenderId: input.assignedLenderId,
        tags: input.tags,
        contacted: input.contacted,
        priceAbove: input.priceAbove,
        priceBelow: input.priceBelow,
        smartListId: input.smartListId,
        includeTrash: input.includeTrash,
        includeUnclaimed: input.includeUnclaimed,
        lastActivityAfter: input.lastActivityAfter,
        lastActivityBefore: input.lastActivityBefore,
        createdAfter: input.createdAfter,
        createdBefore: input.createdBefore,
        updatedAfter: input.updatedAfter,
        updatedBefore: input.updatedBefore,
      },
    });
  },
};

export default searchPeople;
