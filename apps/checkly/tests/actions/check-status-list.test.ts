import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/check-status-list.ts";

/** Unpaged, and the endpoint a workflow usually wants over the results. */
Deno.test("check-status-list: makes one unpaged call", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ checkId: "c1", hasFailures: false }] }]);
  assertEquals(await action.execute!({}, ctx), [{ checkId: "c1", hasFailures: false }]);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://api.checklyhq.com/v1/check-statuses");
  assertEquals(action.params, []);
});
