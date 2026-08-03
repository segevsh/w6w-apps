import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient } from "../lib/client.ts";

interface Input {
  listIds: string[];
  sourceContactIds?: string[];
  sourceListIds?: string[];
  sourceTagIds?: string[];
  sourceEngagementLevel?: "unqualified" | "low" | "medium" | "high";
  sourceAllActiveContacts?: boolean;
  excludeContactIds?: string[];
}

/**
 * `POST /v3/activities/remove_list_memberships` — the mirror of Add Contacts
 * to Lists, and equally asynchronous: `201` queues, it does not complete.
 *
 * Same mutually-exclusive `source` rule, with one difference from the add
 * side: this endpoint's `source` has **no `segment_id`** option. That asymmetry
 * is the API's, not an omission here.
 *
 * Removing a contact from a list is not an unsubscribe — the contact still
 * exists, still has whatever permission they had, and will still receive
 * campaigns sent to other lists they are on.
 *
 * `idempotent: true` — removing an absent member is a no-op.
 */
const removeContactsFromLists: ActionDefinition<Input> = {
  key: "remove-contacts-from-lists",
  type: "perform",
  resource: "list",
  title: "Remove Contacts from Lists",
  description:
    "Queue a bulk activity removing contacts from one or more lists. Asynchronous — poll the returned activity_id.",
  idempotent: true,
  params: [
    {
      key: "listIds",
      label: "Target list IDs",
      type: "json",
      required: true,
      hint: "JSON array of up to 50 `list_id` values to remove the source contacts from.",
    },
    {
      key: "sourceContactIds",
      label: "Source: contact IDs",
      type: "json",
      hint: "JSON array of `contact_id` values. Mutually exclusive with the other source options.",
    },
    {
      key: "sourceListIds",
      label: "Source: list IDs",
      type: "json",
      hint: "JSON array — take every member of these lists.",
    },
    {
      key: "sourceTagIds",
      label: "Source: tag IDs",
      type: "json",
      hint: "JSON array — take every contact carrying these tags.",
    },
    {
      key: "sourceEngagementLevel",
      label: "Source: engagement level",
      type: "select",
      hint: "This endpoint has no segment source, unlike the add side.",
      options: [
        { value: "unqualified", label: "Unqualified" },
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ],
    },
    {
      key: "sourceAllActiveContacts",
      label: "Source: all active contacts",
      type: "boolean",
      default: false,
      hint: "Billable at Constant Contact. Off by default.",
    },
    {
      key: "excludeContactIds",
      label: "Exclude contact IDs",
      type: "json",
      hint:
        "JSON array of `contact_id` values to keep. Documented for the `all_active_contacts` and `list_ids` sources.",
    },
  ],
  output: [
    { key: "activity_id", type: "string", label: "Activity ID to poll" },
    { key: "state", type: "string", label: "Activity state" },
  ],

  // `async` for the same reason as the add side: a bad source should reject,
  // not throw synchronously.
  async execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    const source: Record<string, unknown> = {};
    if (input.sourceContactIds) source.contact_ids = input.sourceContactIds;
    if (input.sourceListIds) source.list_ids = input.sourceListIds;
    if (input.sourceTagIds) source.tag_ids = input.sourceTagIds;
    if (input.sourceEngagementLevel) source.engagement_level = input.sourceEngagementLevel;
    if (input.sourceAllActiveContacts) source.all_active_contacts = true;

    const chosen = Object.keys(source);
    if (chosen.length !== 1) {
      throw new Error(
        `remove-contacts-from-lists needs exactly one source; got ${
          chosen.length === 0 ? "none" : chosen.join(", ")
        }`,
      );
    }

    const body: Record<string, unknown> = { source, list_ids: input.listIds };
    if (input.excludeContactIds) body.exclude = { contact_ids: input.excludeContactIds };
    return await client.request("/activities/remove_list_memberships", { method: "POST", body });
  },
};

export default removeContactsFromLists;
