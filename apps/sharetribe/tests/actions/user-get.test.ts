import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-get: GET /users/show?id=&include=", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: { id: "u1", type: "user", attributes: { email: "a@b.com" } } } },
  ]);
  const result = await userGet.execute({ id: "u1", include: "profileImage" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/integration_api/users/show");
  assertEquals(queryOf(calls[0].url), { id: "u1", include: "profileImage" });
  assertEquals((result as { id: string }).id, "u1");
});

Deno.test("user-get: omits include when not given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "u1" } } }]);
  await userGet.execute({ id: "u1" }, ctx);
  assertEquals(queryOf(calls[0].url), { id: "u1" });
});
