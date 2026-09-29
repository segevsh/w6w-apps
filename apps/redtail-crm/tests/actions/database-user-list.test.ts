import { assertEquals } from "@std/assert";
import databaseUserList from "../../actions/database-user-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("database-user-list: fetches GET /lists/database_users?page=N", async () => {
  const { ctx, calls } = mockCtx([{
    body: { database_users: [{ id: 280717, first_name: "TWAPI", last_name: "TWAPI" }] },
  }]);
  const out = await databaseUserList.execute({ page: 1 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/public/v1/lists/database_users");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(out.database_users[0].id, 280717);
});
