import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-off-review.ts";

const display = {};

/** The review is a POST to a collection, with the request id in the body. */
Deno.test("time-off-review: POSTs the decision to /time_offs/review", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: {} } }], { display });
  await action.execute!({ timeOffId: "to1", status: "APPROVED" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/time_offs/review");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { time_off_id: "to1", status: "APPROVED" },
  });
});

Deno.test("time-off-review: a denial carries its reason", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], { display });
  await action.execute!({ timeOffId: "to1", status: "REJECTED", reason: "coverage" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).data.reason, "coverage");
});

Deno.test("time-off-review: the request id is required", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ status: "APPROVED" }, ctx),
    Error,
    "`timeOffId`",
  );
  assertEquals(calls.length, 0);
});
