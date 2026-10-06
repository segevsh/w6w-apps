import { assertEquals } from "@std/assert";
import meGet from "../../actions/me-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("me-get: GET /users/me, a workspace token returns only org and token expiry", async () => {
  const { ctx, calls } = mockCtx([{ body: { org: { id: "o1" }, token: { exp: 1900000000 } } }]);
  const out = await meGet.execute({}, ctx) as { org: { id: string } };
  assertEquals(pathOf(calls[0].url), "/api/v1/users/me");
  assertEquals(out.org.id, "o1");
});

Deno.test("me-get: a personal token returns the user fields", async () => {
  const { ctx } = mockCtx([{
    body: { id: "u1", email: "a@b.c", role: "ADMIN", org: { id: "o1" } },
  }]);
  const out = await meGet.execute({}, ctx) as { role: string };
  assertEquals(out.role, "ADMIN");
});
