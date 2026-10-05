import { assertEquals, assertRejects } from "@std/assert";
import earningsGet from "../../actions/earnings-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "year": 5 };

Deno.test("earnings-get: sends GET /v2/earnings with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "uses": 3, "purchase": { "id": "p1" } },
  }]);
  await earningsGet.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/earnings");
  assertEquals(queryOf(calls[0].url), { "year": "5" });
  assertEquals(calls[0].body, null);
});

Deno.test("earnings-get: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: { "success": true, "uses": 3, "purchase": { "id": "p1" } } }]);
  assertEquals(await earningsGet.execute(INPUT, ctx), { "uses": 3, "purchase": { "id": "p1" } });
});

Deno.test("earnings-get: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(earningsGet.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("earnings-get: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(earningsGet.execute(INPUT, ctx)), Error, "refused");
});
