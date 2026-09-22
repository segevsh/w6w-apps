import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, type NocrmPage, stringList, V2 } from "../lib/client.ts";
import { directionParam, leadOrderOptions, leadStatusOptions, listOutput } from "../lib/params.ts";

interface Input {
  direction?: string;
  order?: string;
  limit?: number;
  status?: string[];
  step?: string;
  starred?: boolean;
  userId?: string;
  email?: string;
  fieldKey?: string;
  fieldValue?: string;
  tags?: string;
  offset?: number;
  updatedAfter?: string;
}

/**
 * `GET /api/v2/leads` — list and filter leads.
 *
 * Every parameter below is a row of the List-the-leads table in noCRM's API
 * document (<https://www.nocrm.io/api>, read 2026-09-22), including its Default
 * column. Two details are load-bearing:
 *
 *   - **`offset` is the paging control.** "The leads are returned with a limit
 *     of 100 by default… To get more than 100 leads, you need to do multiple
 *     requests and use the offset parameter to shift the data."
 *   - **`step` must not mix forms.** The document says an array of step names or
 *     an array of step ids, and "You cannot mix step names and step IDs."
 *
 * `field_key`/`field_value` are documented as "only available for Expert
 * accounts"; they are exposed here because the document lists them, with that
 * restriction in the hint rather than hidden in code.
 */
const leadGetMany: ActionDefinition<Input, NocrmPage> = {
  key: "lead-get-many",
  type: "search",
  resource: "lead",
  title: "List Leads",
  description:
    "List leads, filtered by status, step, tags, owner, email or a duplicate-detection " +
    "`field_key`/`field_value` pair, with offset paging (GET /api/v2/leads).",
  params: [
    directionParam("desc"),
    {
      key: "order",
      label: "Sort by",
      type: "select",
      default: "id",
      options: leadOrderOptions,
      hint: "The attribute to order by. The document's default is `id`.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      validation: { integer: true },
      hint: "Maximum number of leads returned. The document's default is 100.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true },
      hint: "Shift the returned data by this many leads — the paging companion to `limit`.",
    },
    {
      key: "status",
      label: "Statuses",
      type: "multiselect",
      options: leadStatusOptions,
      hint: "Return only leads in these statuses.",
    },
    {
      key: "step",
      label: "Steps",
      type: "string",
      hint: "Comma-separated step names, or comma-separated step ids — the document says you " +
        "cannot mix the two forms.",
    },
    {
      key: "starred",
      label: "Starred only",
      type: "boolean",
      hint: "The document: set to `true` to return all starred leads.",
    },
    {
      key: "userId",
      label: "Assigned to",
      type: "string",
      hint: "User id or email — return only that user's leads.",
    },
    {
      key: "email",
      label: "Contains email",
      type: "string",
      hint: "Return leads whose description or comments contain this email address.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated tags; a lead must contain all of them. Predefined tags count.",
    },
    {
      key: "fieldKey",
      label: "Field key",
      type: "string",
      advanced: true,
      hint: "A description field set as a duplicate-detection key. Use together with Field " +
        "value. Expert accounts only, per the document.",
    },
    {
      key: "fieldValue",
      label: "Field value",
      type: "string",
      advanced: true,
      hint: "The value to match for Field key. Use together with Field key.",
    },
    {
      key: "updatedAfter",
      label: "Updated after",
      type: "string",
      advanced: true,
      hint: "Only leads last updated on or after this date. The document also notes it can " +
        "conflict with its `date_range_type` parameter, which this app does not expose.",
    },
  ],
  output: listOutput("Leads"),

  execute(input, ctx) {
    return new NocrmClient(ctx).list(`${V2}/leads`, {
      query: {
        direction: input.direction,
        order: input.order,
        limit: input.limit,
        offset: input.offset,
        status: stringList(input.status)?.join(","),
        step: input.step,
        starred: input.starred,
        user_id: input.userId,
        email: input.email,
        tags: input.tags,
        field_key: input.fieldKey,
        field_value: input.fieldValue,
        updated_after: input.updatedAfter,
      },
    });
  },
};

export default leadGetMany;
