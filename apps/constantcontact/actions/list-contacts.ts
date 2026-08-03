import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient, nextCursor, type PagedResponse } from "../lib/client.ts";

interface Input {
  status?: string;
  email?: string;
  lists?: string;
  segmentId?: string;
  tags?: string;
  include?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
  includeCount?: boolean;
  limit?: number;
  cursor?: string;
}

interface Result extends PagedResponse {
  contacts?: unknown[];
  contacts_count?: number;
  status?: string;
  next_cursor?: string;
}

/**
 * `GET /v3/contacts` — one page of the contacts collection.
 *
 * Defaults matter here. Constant Contact returns *non-deleted* contacts unless
 * `status` says otherwise, and it returns bare contact records unless
 * `include` names the sub-resources you want. Neither default is widened by
 * this action: side-loading `custom_fields`, `list_memberships` and friends is
 * measurably more expensive and most callers do not need them.
 *
 * `segment_id` is the one filter that cannot be combined with the others — the
 * vendor documents it as combinable only with `limit`, and the response comes
 * back with `"status": "processing"` while the segment is still being
 * evaluated. That field is surfaced in the output so a caller can tell a
 * genuinely empty segment from one that has not finished computing.
 */
const listContacts: ActionDefinition<Input> = {
  key: "list-contacts",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description:
    "List contacts, filtered by status, email, list, tag or date. Walks one page — pass `next_cursor` back as `cursor`.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "string",
      hint:
        "Comma-separated. `all`, `active`, `deleted`, `not_set`, `pending_confirmation`, `temp_hold`, `unsubscribed`. Omit to exclude deleted contacts.",
    },
    {
      key: "email",
      label: "Email address",
      type: "string",
      placeholder: "name@example.com",
      hint: "Exact match on a single address.",
    },
    {
      key: "lists",
      label: "List IDs",
      type: "string",
      hint: "Comma-separated `list_id` values, up to 25.",
    },
    {
      key: "segmentId",
      label: "Segment ID",
      type: "string",
      hint:
        "Mutually exclusive with every other filter except Limit. The response carries `status: processing` until the segment finishes evaluating.",
    },
    {
      key: "tags",
      label: "Tag IDs",
      type: "string",
      hint: "Comma-separated `tag_id` values, up to 50.",
    },
    {
      key: "include",
      label: "Include sub-resources",
      type: "string",
      hint:
        "Comma-separated: `custom_fields`, `list_memberships`, `phone_numbers`, `street_addresses`, `taggings`, `notes`. Omitted by default — side-loading costs.",
    },
    { key: "updatedAfter", label: "Updated after", type: "string", hint: "ISO-8601." },
    { key: "updatedBefore", label: "Updated before", type: "string", hint: "ISO-8601." },
    { key: "createdAfter", label: "Created after", type: "string", hint: "ISO-8601." },
    { key: "createdBefore", label: "Created before", type: "string", hint: "ISO-8601." },
    {
      key: "includeCount",
      label: "Include total count",
      type: "boolean",
      default: false,
      hint: "Adds `contacts_count` — the total matching the filter, not the page size.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { min: 1, max: 500, integer: true },
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "Opaque token from a previous response's `next_cursor`.",
    },
  ],
  output: [
    { key: "contacts", type: "array", label: "Contacts" },
    { key: "contacts_count", type: "number", label: "Total matching contacts" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page" },
    { key: "_links", type: "object", label: "Paging links" },
  ],

  async execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    const body = await client.request<Result>("/contacts", {
      query: {
        status: input.status,
        email: input.email,
        lists: input.lists,
        segment_id: input.segmentId,
        tags: input.tags,
        include: input.include,
        updated_after: input.updatedAfter,
        updated_before: input.updatedBefore,
        created_after: input.createdAfter,
        created_before: input.createdBefore,
        include_count: input.includeCount ? true : undefined,
        limit: input.limit ?? 50,
        cursor: input.cursor,
      },
    });
    return { ...body, next_cursor: nextCursor(body?._links) };
  },
};

export default listContacts;
