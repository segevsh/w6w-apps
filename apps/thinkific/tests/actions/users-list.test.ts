import { assertEquals } from "@std/assert";
import usersList from "../../actions/users-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("users-list: namespaces filters as query[key]", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([]) }]);
  await usersList.execute({ email: "bob@example.com", groupId: 5 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/public/v1/users");
  assertEquals(queryOf(calls[0].url), {
    "query[email]": "bob@example.com",
    "query[group_id]": "5",
  });
});

Deno.test("users-list: pagination-only call sends only page/limit", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([]) }]);
  await usersList.execute({ page: 1, limit: 25 }, ctx);
  assertEquals(queryOf(calls[0].url), { page: "1", limit: "25" });
});
