import type { ActionDefinition } from "@w6w/types";
import {
  CONTEXT_PARAM,
  DOMAIN_PARAM,
  FIELDS_PARAM,
  LIMIT_PARAM,
  OdooClient,
  OFFSET_PARAM,
  ORDER_PARAM,
  type ReadInput,
  RECORDS_OUTPUT,
  searchKwargs,
} from "../lib/client.ts";

/**
 * `res.users.search_read` — the instance's users.
 *
 * This is the lookup the assignment fields depend on: `user_id` on a lead, a
 * sales order's salesperson, an activity's owner are all `res.users` ids. A
 * workflow that routes a new lead to an owner needs this action to resolve a
 * name or login into that id.
 *
 * `res.users` and `res.partner` are joined one-to-one — every user HAS a partner
 * record holding their name and contact details, reachable via `partner_id`.
 * So a user's `name` is really their partner's name, which is why searching
 * users by name works even though the field lives on the other model.
 *
 * Read access to `res.users` is itself an access right. A tightly-scoped bot
 * user may legitimately be refused here; that surfaces as an Odoo `AccessError`
 * rather than an empty list, which is the honest outcome.
 *
 * Verified live (2026-08-03): returned
 * `[{"id":6,"display_name":"Joel Willis"},…]`.
 */
const listUsers: ActionDefinition<ReadInput> = {
  key: "list-users",
  type: "search",
  resource: "res.users",
  title: "List Users",
  description:
    "Search Odoo users (`res.users`) — the ids that assignment fields such as a lead's " +
    "salesperson reference. Requires the connected user to have read access to users.",
  params: [DOMAIN_PARAM, FIELDS_PARAM, LIMIT_PARAM, OFFSET_PARAM, ORDER_PARAM, CONTEXT_PARAM],
  output: RECORDS_OUTPUT,

  async execute(input, ctx) {
    const records = await OdooClient.fromConnection(ctx).call<Record<string, unknown>[]>(
      "res.users",
      "search_read",
      [],
      searchKwargs(input),
    );
    return { records, count: records.length };
  },
};

export default listUsers;
