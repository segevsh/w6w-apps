import { assertEquals, assertRejects } from "@std/assert";
import subscriberGet from "../../actions/subscriber-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "subscriberId": "subscriberId-1==" };

Deno.test("subscriber-get: sends GET /v2/subscribers/subscriberId-1%3D%3D with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "subscribers": { "id": "s1" } } }]);
  await subscriberGet.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/subscribers/subscriberId-1%3D%3D");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("subscriber-get: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: { "success": true, "subscribers": { "id": "s1" } } }]);
  assertEquals(await subscriberGet.execute(INPUT, ctx), { "id": "s1" });
});

Deno.test("subscriber-get: also accepts the singular `subscriber` key", async () => {
  const { ctx } = mockCtx([{ body: { success: true, subscriber: { id: "s2" } } }]);
  assertEquals(await subscriberGet.execute(INPUT, ctx), { id: "s2" });
});

Deno.test("subscriber-get: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(subscriberGet.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("subscriber-get: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(subscriberGet.execute(INPUT, ctx)), Error, "refused");
});
