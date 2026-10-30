import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-create-from-quote.ts";

const OK = { body: { data: { jobCreateFromQuote: { job: { id: "j1" }, userErrors: [] } } } };

test("job-create-from-quote: the four non-null fields are always sent, even from an empty form", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({ quoteId: "q1" }, ctx);
  const input = JSON.parse(calls[0].body!).variables.input;
  assertEquals(input.scheduling.createVisits, true);
  assertEquals(input.scheduling.notifyTeam, true);
  assertEquals(input.invoicing, {
    invoicingType: "FIXED_PRICE",
    invoicingSchedule: "ON_COMPLETION",
  });
});

test("job-create-from-quote: explicit falses are honoured, not defaulted away", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({ quoteId: "q1", createVisits: false, notifyTeam: false }, ctx);
  const scheduling = JSON.parse(calls[0].body!).variables.input.scheduling;
  assertEquals(scheduling.createVisits, false);
  assertEquals(scheduling.notifyTeam, false);
});

test("job-create-from-quote: assignees split, and the timeframe is dropped when unset", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({ quoteId: "q1", assignedTo: "u1, u2", startTime: "09:00" }, ctx);
  const input = JSON.parse(calls[0].body!).variables.input;
  assertEquals(input.scheduling.assignedTo, ["u1", "u2"]);
  assertEquals(input.scheduling.startTime, "09:00");
  assertEquals(input.timeframe, undefined);
});

test("job-create-from-quote: never invents a recurrence rule", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({ quoteId: "q1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.input.scheduling.recurrence, undefined);
  assertEquals(action.params?.some((p) => p.key === "recurrence"), false);
});

test("job-create-from-quote: userErrors throws", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        jobCreateFromQuote: {
          job: null,
          userErrors: [{ message: "Quote is not approved" }],
        },
      },
    },
  }]);
  await assertRejects(
    async () => await action.execute({ quoteId: "q1" }, ctx),
    Error,
    "not approved",
  );
});
