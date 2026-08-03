import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient, nextCursor, type PagedResponse } from "../lib/client.ts";

interface Input {
  limit?: number;
  cursor?: string;
}

interface Result extends PagedResponse {
  custom_fields?: unknown[];
  next_cursor?: string;
}

/**
 * `GET /v3/contact_custom_fields` — the account's custom field definitions.
 *
 * This is the lookup that makes the `custom_fields` param on the contact
 * actions usable: those take a `custom_field_id`, and this is the only place
 * to get one. Each definition also carries `name` (the underscored form
 * derived from `label`), a `type`, and for `single_select` / `multi_select`
 * fields the `choices` array whose `choice_id`s a contact value must reference.
 *
 * `limit` caps at 100 here, not the 500 the contact and list collections
 * allow. An account may hold at most 100 custom fields in total.
 */
const listCustomFields: ActionDefinition<Input> = {
  key: "list-custom-fields",
  type: "read",
  resource: "custom-field",
  title: "List Custom Fields",
  description:
    "List the account's custom field definitions — the source of the `custom_field_id` values the contact actions take.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { min: 1, max: 100, integer: true },
      hint: "Caps at 100 on this endpoint, not 500.",
    },
    { key: "cursor", label: "Cursor", type: "string" },
  ],
  output: [
    { key: "custom_fields", type: "array", label: "Custom field definitions" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page" },
    { key: "_links", type: "object", label: "Paging links" },
  ],

  async execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    const body = await client.request<Result>("/contact_custom_fields", {
      query: { limit: input.limit ?? 50, cursor: input.cursor },
    });
    return { ...body, next_cursor: nextCursor(body?._links) };
  },
};

export default listCustomFields;
