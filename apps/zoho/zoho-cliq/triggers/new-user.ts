import userList from "../actions/user-list.ts";
import { drainPages, snapshotTrigger, str } from "../lib/triggers.ts";

/**
 * `GET /api/v2/users?limit=100[&next_token=…]` through `user-list`: "Maximum limit will be 100",
 * continued with `next_token` while `has_more` (https://www.zoho.com/cliq/help/restapi/v2/,
 * "Retrieve all users"). No order is documented (only `sort_by=usage`), so every page is read and
 * the whole collection snapshot-diffed (additions only; more than 50 pages throws).
 */
export default snapshotTrigger({
  key: "new-user",
  title: "New User",
  description: "The run gets each user that joins the Zoho Cliq organization.",
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "display_name", type: "string", label: "Display name" },
    { key: "email_id", type: "string", label: "Email" },
    { key: "organization_id", type: "string", label: "Organization ID" },
  ],
  sample: {
    id: "163315760",
    name: "Yod Agbaria",
    display_name: "Yod",
    email_id: "yoda@zylker.com",
    organization_id: "631836344",
  },
  rows: (_params, ctx) =>
    drainPages(async (nextToken) => {
      const out = await userList.execute({ limit: 100, nextToken }, ctx);
      return { items: out.users, next: out.hasMore ? out.nextToken : undefined };
    }),
  idOf: (item) => str((item as { id?: unknown }).id),
});
