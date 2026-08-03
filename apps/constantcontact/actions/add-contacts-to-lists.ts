import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient } from "../lib/client.ts";

interface Input {
  listIds: string[];
  sourceContactIds?: string[];
  sourceListIds?: string[];
  sourceTagIds?: string[];
  sourceSegmentId?: number;
  sourceEngagementLevel?: "unqualified" | "low" | "medium" | "high";
  sourceAllActiveContacts?: boolean;
  excludeContactIds?: string[];
}

/**
 * `POST /v3/activities/add_list_memberships` — an asynchronous bulk activity.
 * `201` means *queued*, not done; poll `activity_id` with Get Activity Status.
 *
 * The body has two halves: a `source` object naming which contacts to move,
 * and `list_ids` naming where to put them. The `source` properties are
 * **mutually exclusive** — the API expects exactly one of `contact_ids`,
 * `list_ids`, `tag_ids`, `segment_id`, `engagement_level` or
 * `all_active_contacts`. This action surfaces them as separate params so each
 * one can be documented, and asserts the exclusivity locally rather than
 * letting a malformed body come back as an opaque 400.
 *
 * `all_active_contacts` is **billable** at Constant Contact and is left off by
 * default for that reason.
 *
 * Each contact may belong to at most 50 lists, and `list_ids` accepts at most
 * 50 targets.
 *
 * `idempotent: true` — adding a contact to a list it is already on is a no-op.
 */
const addContactsToLists: ActionDefinition<Input> = {
  key: "add-contacts-to-lists",
  type: "perform",
  resource: "list",
  title: "Add Contacts to Lists",
  description:
    "Queue a bulk activity adding contacts to one or more lists. Asynchronous — poll the returned activity_id.",
  idempotent: true,
  params: [
    {
      key: "listIds",
      label: "Target list IDs",
      type: "json",
      required: true,
      hint: "JSON array of up to 50 `list_id` values to add the source contacts to.",
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
      key: "sourceSegmentId",
      label: "Source: segment ID",
      type: "number",
      hint: "A single segment, by its numeric id.",
    },
    {
      key: "sourceEngagementLevel",
      label: "Source: engagement level",
      type: "select",
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
      hint: "JSON array of `contact_id` values to leave out of the activity.",
    },
  ],
  output: [
    { key: "activity_id", type: "string", label: "Activity ID to poll" },
    { key: "state", type: "string", label: "Activity state" },
  ],

  // `async` so a bad source rejects rather than throwing synchronously — a
  // hook that throws before returning its promise is harder for a host to
  // handle uniformly than one that rejects.
  async execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    const source: Record<string, unknown> = {};
    if (input.sourceContactIds) source.contact_ids = input.sourceContactIds;
    if (input.sourceListIds) source.list_ids = input.sourceListIds;
    if (input.sourceTagIds) source.tag_ids = input.sourceTagIds;
    if (input.sourceSegmentId !== undefined) source.segment_id = input.sourceSegmentId;
    if (input.sourceEngagementLevel) source.engagement_level = input.sourceEngagementLevel;
    if (input.sourceAllActiveContacts) source.all_active_contacts = true;

    const chosen = Object.keys(source);
    if (chosen.length !== 1) {
      throw new Error(
        `add-contacts-to-lists needs exactly one source; got ${
          chosen.length === 0 ? "none" : chosen.join(", ")
        }`,
      );
    }

    const body: Record<string, unknown> = { source, list_ids: input.listIds };
    if (input.excludeContactIds) body.exclude = { contact_ids: input.excludeContactIds };
    return await client.request("/activities/add_list_memberships", { method: "POST", body });
  },
};

export default addContactsToLists;
