import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-list: hits users.json and forwards search/sort/company filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("users", [{ id: "USR1" }]) }]);
  const out = await userList.execute(
    { accountId: "ACC1", companyId: "COM1", search: "bob", sort: "email", order: "asc" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/users.json");
  const q = queryOf(calls[0].url);
  assertEquals(q.company_id, "COM1");
  assertEquals(q.search, "bob");
  assertEquals(q.sort, "email");
  assertEquals(q.order, "asc");
  assertEquals(out.users, [{ id: "USR1" }]);
});
