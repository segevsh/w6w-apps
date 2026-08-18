import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/run-retry-details.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };

Deno.test("run-retry-details: a retryable run reports retryable with no reason", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { data: { failed_nodes: [{ unique_id: "model.shop.fct_orders" }] } } }],
    { display },
  );
  const result = await action.execute!({ runId: "7" }, ctx) as {
    retryable: boolean;
    reason?: string;
    failedNodes: unknown[];
  };
  assertEquals(calls[0].url, "https://ab123.us1.dbt.com/api/v2/accounts/42/runs/7/retry/");
  assertEquals(calls[0].method, "GET");
  assertEquals(result.retryable, true);
  assertEquals(result.reason, undefined);
  assertEquals(result.failedNodes.length, 1);
});

/** RETRY_NOT_LATEST_RUN is the one that catches people. */
Deno.test("run-retry-details: an unretryable run reports dbt's named reason", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { data: { retry_not_supported_reason: "RETRY_NOT_LATEST_RUN" } } }],
    { display },
  );
  const result = await action.execute!({ runId: "7" }, ctx) as {
    retryable: boolean;
    reason: string;
  };
  assertEquals(result.retryable, false);
  assertEquals(result.reason, "RETRY_NOT_LATEST_RUN");
});

/** Too old to answer about is a "no", not a failure of this action. */
Deno.test("run-retry-details: a 404 becomes 'not retryable' rather than an error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { status: { user_message: "Not found." } } }], {
    display,
  });
  const result = await action.execute!({ runId: "7" }, ctx) as {
    retryable: boolean;
    reason: string;
  };
  assertEquals(result.retryable, false);
  assert(/too old/.test(result.reason), result.reason);
});

Deno.test("run-retry-details: any other failure is still raised", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }], { display });
  await assertRejects(async () => await action.execute!({ runId: "7" }, ctx), Error, "500");
});

Deno.test("run-retry-details: needs a run id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "runId");
  assertEquals(calls.length, 0);
});
