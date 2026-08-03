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
  id: number;
  mergeTags?: boolean;
  firstName?: string;
  lastName?: string;
  stage?: string;
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
  customFields?: unknown;
}

/**
 * `PUT /people/{id}` — update a contact.
 *
 * ## The collection fields REPLACE, they do not merge
 *
 * This is the one thing that turns a routine update into data loss, and the
 * endpoint's documentation flags it twice in red:
 *
 *   > "Please note that when using the tags property, all existing tags for a
 *   > person will be overwritten to use the new list of tags provided."
 *
 *   > "The `phones` argument will overwrite all existing phone numbers,
 *   > including those associated with relationships. For example, if a contact
 *   > has phone numbers of `123-456-7890` and `123-456-7891` and you want to
 *   > edit the second one to `123-456-7892`, you'll need to send the first one
 *   > along with the updated second number."
 *
 * So editing one phone number means sending them all, and adding one tag means
 * sending the whole set — *unless* you use `mergeTags`, which the docs offer for
 * tags specifically: "To merge new tags with the contact's existing tag list,
 * set the `mergeTags` query parameter in the request URL to true." There is no
 * equivalent for phones or emails.
 *
 * `lib/client.ts`'s `compact()` is what keeps this survivable: a param the user
 * left untouched is `undefined` and is stripped from the body entirely, so it is
 * never sent as a `null` that would clear the field.
 *
 * ## `source` and `sourceUrl` are absent on purpose
 *
 * "The `source` and `sourceUrl` fields can only be set once on the creation of a
 * person. This **cannot** be changed via the PUT request." Offering them here
 * would be offering a control that silently does nothing.
 *
 * ## Setting `contacted` has a side effect
 *
 * "Changing the `contacted` field to `true` will pause action plans." Stated on
 * the param, because pausing a nurture sequence is not what someone updating a
 * flag expects to be doing.
 */
const updatePerson: ActionDefinition<Input> = {
  key: "update-person",
  type: "perform",
  resource: "person",
  title: "Update Person",
  idempotent: true,
  description:
    "Update a contact by id. Careful: `tags`, `phones`, `emails` and `collaborators` REPLACE the " +
    "existing list rather than adding to it — send the full set, or use Merge tags for tags. " +
    "`source` and `sourceUrl` cannot be changed after creation and are not offered here.",
  params: [
    { key: "id", label: "Person id", type: "number", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "stage",
      label: "Stage",
      type: "string",
      hint: "Stage name. List the account's stages with the List Stages action.",
    },
    {
      key: "assignedUserId",
      label: "Assigned user id",
      type: "number",
      hint: "Reassign to this agent. Ids come from the List Users action.",
    },
    {
      ...EMAILS_PARAM,
      hint: EMAILS_PARAM.hint +
        " **Replaces every existing email address** — send the full list, not just the new one.",
    },
    {
      ...PHONES_PARAM,
      hint: PHONES_PARAM.hint +
        " **Replaces every existing phone number**, including ones attached to relationships. To " +
        "edit one number, send all of them.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      item: { type: "string" },
      hint: "**Replaces every existing tag** unless Merge tags is on.",
    },
    {
      key: "mergeTags",
      label: "Merge tags",
      type: "boolean",
      hint:
        "Add the tags above to the contact's existing tags instead of replacing them. Sent as " +
        "a query parameter. There is no equivalent option for phones or emails.",
    },
    {
      key: "assignedTo",
      label: "Assigned to (name)",
      type: "string",
      advanced: true,
      hint: "Full name of the agent. Prefer the id where you have it.",
    },
    { key: "assignedPondId", label: "Assigned pond id", type: "number", advanced: true },
    { key: "assignedLenderId", label: "Assigned lender id", type: "number", advanced: true },
    { key: "assignedLenderName", label: "Assigned lender name", type: "string", advanced: true },
    {
      key: "price",
      label: "Price",
      type: "number",
      advanced: true,
      hint: "Estimated buy/sell price.",
    },
    {
      key: "contacted",
      label: "Contacted",
      type: "boolean",
      advanced: true,
      hint: "Setting this to true **pauses any running action plans** for the contact.",
    },
    { key: "background", label: "Background", type: "text", advanced: true },
    {
      key: "collaborators",
      label: "Collaborator user ids",
      type: "array",
      item: { type: "number" },
      advanced: true,
      hint: "**Replaces** the collaborator list — an omitted id is a removal.",
    },
    ADDRESSES_PARAM,
    {
      key: "timeframeId",
      label: "Timeframe id",
      type: "number",
      advanced: true,
      hint: "Buying/selling timeframe, from the `/timeframes` endpoint.",
    },
    CUSTOM_FIELDS_PARAM,
  ],
  output: [{ key: "id", type: "number", label: "Person id" }],

  execute(input, ctx) {
    const body = withCustomFields({
      firstName: input.firstName,
      lastName: input.lastName,
      stage: input.stage,
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
    }, input.customFields);

    return new FubClient(ctx).request(`/people/${input.id}`, {
      method: "PUT",
      query: { mergeTags: input.mergeTags },
      body,
    });
  },
};

export default updatePerson;
