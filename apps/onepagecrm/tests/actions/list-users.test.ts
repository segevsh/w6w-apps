import { assertEquals } from "@std/assert";
import listUsers from "../../actions/list-users.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-users: GET /users returns the unpaginated array", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ user: { id: "u1", email: "a@b.com" } }]) }]);
  const out = await listUsers.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v3/users");
  assertEquals(calls[0].url.includes("?"), false);
  assertEquals(out.users, [{ user: { id: "u1", email: "a@b.com" } }]);
});

Deno.test("list-users: a non-array data field yields an empty list", async () => {
  const { ctx } = mockCtx([{ body: envelope({}) }]);
  assertEquals((await listUsers.execute({}, ctx) as Record<string, unknown>).users, []);
});
