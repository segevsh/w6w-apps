import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/user-get.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("user-get: sends GET /users/u1 and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", displayName: "Pat" } }]);
  const out = await action.execute({ userId: "u1" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/users/u1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { id: "u1", displayName: "Pat" });
});

Deno.test("user-get: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () => await action.execute({ userId: "u1" } as never, ctx),
    Error,
    "AccuLynx 404",
  );
});
