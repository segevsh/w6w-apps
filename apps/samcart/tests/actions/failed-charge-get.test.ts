import { assertEquals, assertRejects } from "@std/assert";
import failedChargeGet from "../../actions/failed-charge-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "chargeId": 1337,
  "createdAtMin": "2025-01-16T14:30:00Z",
  "createdAtMax": "2025-01-31",
  "testMode": "false",
};
const RESPONSE = { "id": 1, "marker": true };

Deno.test("failed-charge-get: sends GET /v1/failed-charges/1337 with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await failedChargeGet.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/failed-charges/1337");
  assertEquals(queryOf(calls[0].url), {
    "created_at_min": "2025-01-16T14:30:00Z",
    "created_at_max": "2025-01-31",
    "test_mode": "false",
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("failed-charge-get: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await failedChargeGet.execute(INPUT, ctx), { "id": 1, "marker": true });
});

Deno.test("failed-charge-get: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(failedChargeGet.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});

Deno.test("failed-charge-get: a non-integer chargeId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        failedChargeGet.execute({ ...INPUT, chargeId: "1/../2" as unknown as number }, ctx),
      ),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
