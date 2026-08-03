import { assertEquals } from "@std/assert";
import { ACCOUNT_BASE, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

Deno.test("user-list: GETs the account's users", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [{ userId: "u-1" }] } }]);
  const out = await action.execute({}, ctx) as { users: Array<{ userId: string }> };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/users`);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.users[0].userId, "u-1");
});

Deno.test("user-list: maps every filter to Docusign's query names", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    email: "a@b.com",
    emailSubstring: "@b.com",
    userNameSubstring: "Ann",
    status: "Active",
    groupId: "g-1",
    additionalInfo: true,
    includeLicense: true,
    count: 10,
    startPosition: 0,
  }, ctx);

  const q = queryOf(calls[0]);
  assertEquals(q.get("email"), "a@b.com");
  assertEquals(q.get("email_substring"), "@b.com");
  assertEquals(q.get("user_name_substring"), "Ann");
  assertEquals(q.get("status"), "Active");
  assertEquals(q.get("group_id"), "g-1");
  assertEquals(q.get("additional_info"), "true");
  assertEquals(q.get("include_license"), "true");
  assertEquals(q.get("count"), "10");
  assertEquals(q.get("start_position"), "0");
});

Deno.test("user-list: is a read-only search — no user administration is exposed", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "user");
});
