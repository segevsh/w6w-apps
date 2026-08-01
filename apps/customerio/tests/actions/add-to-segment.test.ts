import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-to-segment.ts";

Deno.test("add-to-segment: posts ids to /segments/:id/add_customers, no id_type query for id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute!(
    { segmentId: "42", personIds: ["u1", "u2"], idType: "id" },
    ctx,
  );
  assertEquals(calls[0].url, "https://track.customer.io/api/v1/segments/42/add_customers");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { ids: ["u1", "u2"] });
  assertEquals(result, { success: true });
});

Deno.test("add-to-segment: appends ?id_type= for a non-default id type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ segmentId: "42", personIds: ["a@b.com"], idType: "email" }, ctx);
  assertEquals(
    calls[0].url,
    "https://track.customer.io/api/v1/segments/42/add_customers?id_type=email",
  );
});

Deno.test("add-to-segment: rejects a blank segmentId or empty personIds", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ segmentId: "", personIds: ["u1"] }, ctx),
    Error,
    "`segmentId` is required",
  );
  await assertRejects(
    async () => await action.execute!({ segmentId: "42", personIds: [] }, ctx),
    Error,
    "`personIds` must be a non-empty array",
  );
  assertEquals(calls.length, 0);
});

Deno.test("add-to-segment: rejects more than 1,000 ids", async () => {
  const { ctx, calls } = mockCtx();
  const ids = Array.from({ length: 1001 }, (_, i) => `u${i}`);
  const err = await assertRejects(
    async () => await action.execute!({ segmentId: "42", personIds: ids }, ctx),
    Error,
  );
  assert(err.message.includes("1,000"));
  assertEquals(calls.length, 0);
});
