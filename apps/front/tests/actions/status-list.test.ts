import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/status-list.ts";

Deno.test("status-list: reads the company's ticket statuses", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { _results: [{ id: "sts_1", name: "Waiting on customer" }] },
  }]);
  const out = await action.execute!({}, ctx) as Array<{ id: string }>;
  assertEquals(out[0].id, "sts_1");
  assertEquals(new URL(calls[0].url).pathname, "/company/statuses");
});

/** A company without ticketing gets an empty list, which is the answer. */
Deno.test("status-list: an empty list is a result, not a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { _results: [] } }]);
  assertEquals(await action.execute!({}, ctx), []);
});
