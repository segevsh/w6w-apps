import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-create-from-job.ts";

test("invoice-create-from-job: origin is pinned to INTEGRATIONS and is not a parameter", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { invoiceCreateFromJob: { invoice: { id: "i1" }, userErrors: [] } } },
  }]);
  await action.execute({ jobId: "j1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, { jobId: "j1", origin: "INTEGRATIONS" });
  assertEquals(action.params?.some((p) => p.key === "origin"), false);
});

test("invoice-create-from-job: uses the from-job mutation, not the general invoiceCreate", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { invoiceCreateFromJob: { invoice: { id: "i1" }, userErrors: [] } } },
  }]);
  await action.execute({ jobId: "j1" }, ctx);
  const query = JSON.parse(calls[0].body!).query as string;
  assert(query.includes("invoiceCreateFromJob("));
  assert(!/\binvoiceCreate\(/.test(query));
});

test("invoice-create-from-job: nothing left to bill throws", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        invoiceCreateFromJob: {
          invoice: null,
          userErrors: [{ message: "There is no uninvoiced work on this job" }],
        },
      },
    },
  }]);
  await assertRejects(
    async () => await action.execute({ jobId: "j1" }, ctx),
    Error,
    "no uninvoiced work",
  );
});

test("invoice-create-from-job: declares itself non-idempotent", () => {
  assertEquals(action.idempotent, false);
});
