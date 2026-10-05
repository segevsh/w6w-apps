import { assertEquals, assertRejects } from "@std/assert";
import refundGet from "../../actions/refund-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "refundId": 77 };
const RESPONSE = { "id": 1, "marker": true };

Deno.test("refund-get: sends GET /v1/refunds/77 with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await refundGet.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/refunds/77");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("refund-get: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await refundGet.execute(INPUT, ctx), { "id": 1, "marker": true });
});

Deno.test("refund-get: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(() => Promise.resolve(refundGet.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});

Deno.test("refund-get: a non-integer refundId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        refundGet.execute({ ...INPUT, refundId: "1/../2" as unknown as number }, ctx),
      ),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
