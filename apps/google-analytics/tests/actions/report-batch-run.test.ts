import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/report-batch-run.ts";

const display = { propertyId: "123" };

Deno.test("report-batch-run: posts the requests array unchanged", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { reports: [] } }], { display });
  await action.execute!({ requests: '[{"metrics":[{"name":"sessions"}]}]' }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/properties/123:batchRunReports");
  assertEquals(JSON.parse(calls[0].body!), { requests: [{ metrics: [{ name: "sessions" }] }] });
});

Deno.test("report-batch-run: Google's five-report cap is enforced locally, by name", async () => {
  // The API's own error does not name the limit.
  const { ctx, calls } = mockCtx([], { display });
  const six = JSON.stringify(Array.from({ length: 6 }, () => ({ metrics: [] })));
  await assertRejects(
    async () => await action.execute!({ requests: six }, ctx),
    Error,
    "at most 5 reports per batch",
  );
  assertEquals(calls.length, 0);
});

Deno.test("report-batch-run: an empty array is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ requests: "[]" }, ctx),
    Error,
    "requests",
  );
  assertEquals(calls.length, 0);
});
