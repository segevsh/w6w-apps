import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/remove-from-segment.ts";

Deno.test("remove-from-segment: posts ids to /segments/:id/remove_customers", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute!({ segmentId: "42", personIds: ["u1", "u2"] }, ctx);
  assertEquals(calls[0].url, "https://track.customer.io/api/v1/segments/42/remove_customers");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { ids: ["u1", "u2"] });
  assertEquals(result, { success: true });
});

Deno.test("remove-from-segment: appends ?id_type= for a non-default id type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ segmentId: "42", personIds: ["cio_x"], idType: "cio_id" }, ctx);
  assertEquals(
    calls[0].url,
    "https://track.customer.io/api/v1/segments/42/remove_customers?id_type=cio_id",
  );
});

Deno.test("remove-from-segment: rejects a blank segmentId or empty personIds", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ segmentId: "42", personIds: [] }, ctx),
    Error,
    "`personIds` must be a non-empty array",
  );
  assertEquals(calls.length, 0);
});

Deno.test("remove-from-segment: rejects more than 1,000 ids", async () => {
  const { ctx, calls } = mockCtx();
  const ids = Array.from({ length: 1001 }, (_, i) => `u${i}`);
  const err = await assertRejects(
    async () => await action.execute!({ segmentId: "42", personIds: ids }, ctx),
    Error,
  );
  assert(err.message.includes("1,000"));
  assertEquals(calls.length, 0);
});
