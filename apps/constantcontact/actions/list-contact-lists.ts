import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient, nextCursor, type PagedResponse } from "../lib/client.ts";

interface Input {
  name?: string;
  status?: string;
  channelType?: "email" | "sms";
  includeCount?: boolean;
  includeMembershipCount?: "all" | "active";
  limit?: number;
  cursor?: string;
}

interface Result extends PagedResponse {
  lists?: unknown[];
  lists_count?: number;
  next_cursor?: string;
}

/**
 * `GET /v3/contact_lists` — one page of the account's contact lists.
 *
 * `include_membership_count` takes a *word*, not a boolean: `active` counts
 * only mailable contacts, `all` counts everything including unsubscribed and
 * deleted ones. Those two numbers routinely differ by a lot, so the choice is
 * left to the caller rather than defaulted.
 *
 * The vendor notes this endpoint cannot filter by update date, which is why
 * there is no `updated_after` here — its absence is the API's, not an
 * omission.
 */
const listContactLists: ActionDefinition<Input> = {
  key: "list-contact-lists",
  type: "read",
  resource: "list",
  title: "List Contact Lists",
  description:
    "List contact lists. Walks one page — pass `next_cursor` back as `cursor`. No date filtering: the API has none.",
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "Exact, full list name. Not a substring search.",
    },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "Comma-separated: `all`, `active`, `deleted`.",
    },
    {
      key: "channelType",
      label: "Channel",
      type: "select",
      hint: "Defaults to `email` on the API side.",
      options: [
        { value: "email", label: "Email" },
        { value: "sms", label: "SMS" },
      ],
    },
    {
      key: "includeCount",
      label: "Include total list count",
      type: "boolean",
      default: false,
      hint: "Adds `lists_count` — how many lists match, not how many contacts.",
    },
    {
      key: "includeMembershipCount",
      label: "Include membership count",
      type: "select",
      hint: "Adds `membership_count` per list. `active` counts mailable contacts only.",
      options: [
        { value: "active", label: "Active (mailable) contacts only" },
        { value: "all", label: "All contacts" },
      ],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { min: 1, max: 500, integer: true },
    },
    { key: "cursor", label: "Cursor", type: "string" },
  ],
  output: [
    { key: "lists", type: "array", label: "Contact lists" },
    { key: "lists_count", type: "number", label: "Total matching lists" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page" },
    { key: "_links", type: "object", label: "Paging links" },
  ],

  async execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    const body = await client.request<Result>("/contact_lists", {
      query: {
        name: input.name,
        status: input.status,
        channel_type: input.channelType,
        include_count: input.includeCount ? true : undefined,
        include_membership_count: input.includeMembershipCount,
        limit: input.limit ?? 50,
        cursor: input.cursor,
      },
    });
    return { ...body, next_cursor: nextCursor(body?._links) };
  },
};

export default listContactLists;
