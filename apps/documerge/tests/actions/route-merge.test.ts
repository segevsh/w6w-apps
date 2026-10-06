import { assert, assertEquals, assertRejects } from "@std/assert";
import routeMerge from "../../actions/route-merge.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("route-merge: POST /api/routes/merge/{key}", async () => {
  const { ctx, calls } = mockCtx([{ body: "{\n \"message\": 'merge queued!',\n}" }]);
  const out = await routeMerge.execute(
    { "key": "rtKey123", "data": { "customer_name": "Ada" } } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/routes/merge/rtKey123");
  assert(typeof (out as { message: string }).message === "string");
});

Deno.test("route-merge: the data object is the request body, verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "queued" } }]);
  await routeMerge.execute({ "key": "rtKey123", "data": { "customer_name": "Ada" } } as never, ctx);
  assertEquals(JSON.parse(calls[0].body!), { customer_name: "Ada" });
});

Deno.test("route-merge: with no data it sends no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "queued" } }]);
  await routeMerge.execute({ key: "k1" } as never, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(pathOf(calls[0].url).endsWith("/k1"), true);
});

Deno.test("route-merge: a text/plain answer is returned as { message }", async () => {
  const { ctx } = mockCtx([{ body: "queued ok", headers: { "content-type": "text/plain" } }]);
  assertEquals(await routeMerge.execute({ key: "k1" } as never, ctx), { message: "queued ok" });
});

Deno.test("route-merge: non-object data is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(routeMerge.execute({ key: "k1", data: "[1]" } as never, ctx)),
    Error,
    "JSON object",
  );
  assertEquals(calls.length, 0);
});

Deno.test("route-merge: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        routeMerge.execute({ "key": "rtKey123", "data": { "customer_name": "Ada" } } as never, ctx),
      ),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});

Deno.test("route-merge: idempotency is declared as false", () =>
  assertEquals(routeMerge.idempotent, false));
