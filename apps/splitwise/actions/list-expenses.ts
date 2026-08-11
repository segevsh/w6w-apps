import type { ActionDefinition } from "@w6w/types";
import { pick, SplitwiseClient } from "../lib/client.ts";

/**
 * `GET /get_expenses` — the current user's expenses, filtered.
 *
 * ## `group_id` silently wins over `friend_id`
 *
 * > If provided, only expenses in that group will be returned, **and
 * > `friend_id` will be ignored**.
 *
 * There is no error for supplying both — the friend filter just evaporates, and
 * the result looks like a complete answer to a question nobody asked. This
 * action logs a warning when both are set, because the alternative is a
 * workflow quietly processing the wrong rows.
 *
 * Note `group_id: 0` is meaningful rather than falsy here: it selects the
 * expenses that belong to **no** group, matching the synthetic group 0 in List
 * Groups. `lib/client.ts#compact` keeps `0` for exactly this reason.
 *
 * ## Pagination is offset-based and the vendor's default is small
 *
 * `limit` defaults to **20** and `offset` to 0 — the vendor's own values, and
 * unusually modest, so they are prefilled here rather than left blank. There is
 * no total count in the body and no `Link` header: you page until a page comes
 * back shorter than `limit`.
 *
 * ## The date filters, and the one typo worth knowing about
 *
 * Four of them: `dated_after` / `dated_before` filter on when the expense
 * *happened*, `updated_after` / `updated_before` on when it was last touched —
 * which is the pair a polling workflow wants, since editing an old expense does
 * not change its date. All four are ISO 8601 date-times. `updated_after` is
 * declared in the reference with `format: "update-time"`, which is not an
 * OpenAPI format and is plainly a typo for `date-time`; its three siblings all
 * say `date-time` and it is sent as one.
 *
 * Deleted expenses come back with `deleted_at` set rather than being omitted,
 * so a workflow that acts on every row will act on tombstones unless it filters
 * them out.
 */
interface Input {
  group_id?: number;
  friend_id?: number;
  dated_after?: string;
  dated_before?: string;
  updated_after?: string;
  updated_before?: string;
  limit?: number;
  offset?: number;
}

const listExpenses: ActionDefinition<Input> = {
  key: "list-expenses",
  type: "search",
  resource: "expense",
  title: "List Expenses",
  description:
    "The current user's expenses, filterable by group, friend and date, with offset paging. " +
    "Deleted expenses are included, carrying a `deleted_at`.",
  params: [
    {
      key: "group_id",
      label: "Group ID",
      type: "number",
      validation: { integer: true, min: 0 },
      hint:
        "Only expenses in this group. `0` selects expenses that belong to no group. Setting this " +
        "makes Splitwise ignore the friend filter entirely.",
    },
    {
      key: "friend_id",
      label: "Friend user ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Only expenses between the current user and this one. Ignored when a group is set.",
    },
    {
      key: "dated_after",
      label: "Dated after",
      type: "datetime",
      row: "dated",
      hint: "On the expense's own date — when it happened.",
    },
    { key: "dated_before", label: "Dated before", type: "datetime", row: "dated" },
    {
      key: "updated_after",
      label: "Updated after",
      type: "datetime",
      row: "updated",
      hint: "On last modification. This is the filter a polling workflow wants — editing an old " +
        "expense does not move its date.",
    },
    { key: "updated_before", label: "Updated before", type: "datetime", row: "updated" },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 20,
      validation: { integer: true, min: 1 },
      hint: "Splitwise's own default is 20. It publishes no maximum.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Rows to skip. There is no total in the response — page until a page is short.",
    },
  ],
  output: [{ key: "expenses", type: "array", label: "Expenses" }],

  async execute(input, ctx) {
    if (input.group_id !== undefined && input.group_id !== null && input.friend_id) {
      ctx.log(
        "warn",
        "Splitwise ignores friend_id when group_id is set — the friend filter will not apply",
        { group_id: input.group_id, friend_id: input.friend_id },
      );
    }

    const body = await new SplitwiseClient(ctx).request("/get_expenses", {
      query: {
        group_id: input.group_id,
        friend_id: input.friend_id,
        dated_after: input.dated_after,
        dated_before: input.dated_before,
        updated_after: input.updated_after,
        updated_before: input.updated_before,
        limit: input.limit,
        offset: input.offset,
      },
    });
    return { expenses: pick<unknown[]>(body, "expenses", []) };
  },
};

export default listExpenses;
