import { assertEquals } from "@std/assert";
import usersUpdate from "../../actions/users-update.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("users-update: PUTs to /users/{id} and returns the 204 status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await usersUpdate.execute({ id: "1", first_name: "Bobby" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/public/v1/users/1");
  assertEquals(JSON.parse(calls[0].body!).first_name, "Bobby");
  assertEquals(out, { status: 204 });
});

Deno.test("users-update: passes provider through as a bare query param for the External ID form", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await usersUpdate.execute({ id: "ext-1", provider: "OPENID_CONNECT", bio: "hi" }, ctx);
  assertEquals(queryOf(calls[0].url), { provider: "OPENID_CONNECT" });
});

Deno.test("users-update: is idempotent — same input converges to the same state", () => {
  assertEquals(usersUpdate.idempotent, true);
});
