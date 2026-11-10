import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userList from "../../actions/user-list.ts";
import { mockCtx, pagedEnvelope, pathOf, queryOf } from "../_helpers.ts";

test("user-list: calls GET /users/v1/users with repeated-key array filters", async () => {
  const { ctx, calls } = mockCtx([
    { body: pagedEnvelope({ users: [{ userId: 1 }] }, { offset: 0, total: 1 }) },
  ]);
  const out = await userList.execute({ userIds: "1,2", userStatus: "active", limit: 5 }, ctx);
  assertEquals(pathOf(calls[0].url), "/users/v1/users");
  assertEquals(queryOf(calls[0].url), { userIds: ["1", "2"], userStatus: "active", limit: "5" });
  assertEquals(out, { users: [{ userId: 1 }], offset: 0, total: 1 });
});

test("user-list: defaults to an empty users array and offset 0 when the API sends neither", async () => {
  const { ctx } = mockCtx([{ body: pagedEnvelope({}) }]);
  const out = await userList.execute({}, ctx);
  assertEquals(out, { users: [], offset: 0 });
});

test("user-list: sort and order are sent when set and left out otherwise", async () => {
  const sorted = mockCtx([{ body: pagedEnvelope({ users: [] }) }]);
  await userList.execute({ sort: "created_at", order: "desc", limit: 5 }, sorted.ctx);
  assertEquals(queryOf(sorted.calls[0].url), { sort: "created_at", order: "desc", limit: "5" });
  const plain = mockCtx([{ body: pagedEnvelope({ users: [] }) }]);
  await userList.execute({ limit: 5 }, plain.ctx);
  assertEquals(queryOf(plain.calls[0].url), { limit: "5" });
});
