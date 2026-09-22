import { assertEquals } from "@std/assert";

import listUsers from "../../actions/list-users.ts";
import { API_ROOT, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-users: GET /users and returns the {users:[…]} envelope verbatim", async () => {
  const payload = { users: [{ id: "u1", name: "Ada" }] };
  const { ctx, calls } = mockCtx([{ body: payload }]);

  const out = await listUsers.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/users");
  assertEquals(calls[0].url, `${API_ROOT}/users`);
  assertEquals(out, payload);
});

Deno.test("list-users: active filters are sent, including a false one", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [] } }, { body: { users: [] } }]);

  await listUsers.execute({ active: true }, ctx);
  await listUsers.execute({ active: false }, ctx);

  assertEquals(queryOf(calls[0].url), { active: "true" });
  assertEquals(queryOf(calls[1].url), { active: "false" });
});

Deno.test("list-users: unset means 'do not filter', so no query at all", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [] } }]);

  await listUsers.execute({}, ctx);

  assertEquals(queryOf(calls[0].url), {});
  assertEquals(listUsers.type, "read");
});
