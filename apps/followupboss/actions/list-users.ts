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
  sort?: string;
  role?: string;
  name?: string;
  email?: string;
  fields?: string;
  includeDeleted?: boolean;
}

/**
 * `GET /users` — the account's agents, brokers and lenders.
 *
 * The id lookup half the write actions in this app depend on: assignment,
 * task ownership, deal visibility and appointment invitees are all keyed on user
 * id.
 *
 * ## `role` reports three values and means more than three things
 *
 * From the endpoint's own note: "the `role` value in the response will only map
 * to three options: `Agent`, `Broker` and `Lender`. `Broker` is the same as an
 * Owner in the front end of Follow Up Boss if `isOwner` is also `true`,
 * otherwise they are just an Admin."
 *
 * So the UI's Owner / Admin / Agent / Team Leader / Lender ladder is flattened
 * on the wire, and reconstructing it takes two more fields:
 *   - Owner  = `role: "Broker"` **and** `isOwner: true`
 *   - Admin  = `role: "Broker"` **and** `isOwner: false`
 *   - Team Leader / ISA = `role: "Agent"` with a non-empty `teamLeaderOf`
 *     ("if a user is an `Agent` and `teamLeaderOf` contains the id of `1` in the
 *     list, that means the user is a Team Leader / ISA Role")
 *
 * Filtering on `role` alone therefore cannot distinguish an owner from an admin.
 *
 * ## `calling` is opt-in
 *
 * "By default, this endpoint does not return `calling` information about the
 * phone number associated with Follow Up Boss. In order to retrieve this
 * additional information, use the `fields` argument and include `calling`."
 * Notably `allFields` does **not** include it — calling data has to be named
 * explicitly.
 */
const listUsers: ActionDefinition<Input> = {
  key: "list-users",
  type: "search",
  resource: "user",
  title: "List Users",
  description:
    "List the account's agents, brokers and lenders — the id lookup for assignment, task " +
    "ownership, deal visibility and appointment invitees. Note `role` only ever reports Agent, " +
    "Broker or Lender: an Owner is a Broker with `isOwner` true, an Admin is one without.",
  params: [
    {
      key: "role",
      label: "Role",
      type: "select",
      options: [
        { value: "Agent", label: "Agent" },
        { value: "Broker", label: "Broker (owner or admin)" },
        { value: "Lender", label: "Lender" },
      ],
      hint: "Only these three values exist on the wire. Owner vs Admin is `isOwner` on the " +
        "returned record, not a separate role.",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Find a user by email address.",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "Full name. **Exact match only** — no partial matching on this endpoint.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      advanced: true,
      options: [
        { value: "id", label: "Id" },
        { value: "name", label: "Name" },
        { value: "created", label: "Created" },
      ],
      hint: "Only these three fields are sortable here.",
    },
    {
      ...FIELDS_PARAM,
      advanced: true,
      hint: "Comma-separated fields, or `allFields`. Calling information is the exception: it is " +
        "excluded even from `allFields` and must be requested by name, e.g. `id,name,calling`.",
    },
    {
      key: "includeDeleted",
      label: "Include deleted",
      type: "boolean",
      advanced: true,
      hint: "Include users who have been deleted — useful when resolving an id on a historical " +
        "record whose owner has since left.",
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx): Promise<FubList> {
    return new FubClient(ctx).list("/users", {
      query: {
        ...pageQuery(input),
        sort: input.sort,
        role: input.role,
        name: input.name,
        email: input.email,
        fields: input.fields,
        includeDeleted: input.includeDeleted,
      },
    });
  },
};

export default listUsers;
