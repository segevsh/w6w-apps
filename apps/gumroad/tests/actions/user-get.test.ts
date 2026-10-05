import { assertEquals, assertRejects } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {};

Deno.test("user-get: sends GET /v2/user with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "user": { "id": "x1", "marker": true } },
  }]);
  await userGet.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/user");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("user-get: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: { "success": true, "user": { "id": "x1", "marker": true } } }]);
  assertEquals(await userGet.execute(INPUT, ctx), { "id": "x1", "marker": true });
});

Deno.test("user-get: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(userGet.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("user-get: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(userGet.execute(INPUT, ctx)), Error, "refused");
});
