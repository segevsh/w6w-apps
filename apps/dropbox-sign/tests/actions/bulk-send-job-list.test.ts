import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bulk-send-job-list.ts";

Deno.test("bulk-send-job-list: pages the jobs collection", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { list_info: { num_pages: 1 }, bulk_send_jobs: [{ bulk_send_job_id: "b1" }] },
  }]);
  assertEquals(await action.execute!({}, ctx), [{ bulk_send_job_id: "b1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/v3/bulk_send_job/list");
});
