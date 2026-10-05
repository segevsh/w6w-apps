import { assertEquals, assertRejects } from "@std/assert";
import chargeRefund from "../../actions/charge-refund.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "chargeId": 1337, "amount": 2500 };
const RESPONSE = { "id": 1, "marker": true };

Deno.test("charge-refund: sends POST /v1/refunds/charges/1337/ with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await chargeRefund.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/refunds/charges/1337/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(JSON.parse(calls[0].body ?? "null"), { "amount": 2500 });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("charge-refund: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await chargeRefund.execute(INPUT, ctx), { "id": 1, "marker": true });
});

Deno.test("charge-refund: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(() => Promise.resolve(chargeRefund.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});

Deno.test("charge-refund: a non-integer chargeId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        chargeRefund.execute({ ...INPUT, chargeId: "1/../2" as unknown as number }, ctx),
      ),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
