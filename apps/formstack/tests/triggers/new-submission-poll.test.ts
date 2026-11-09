import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-submission-poll.ts";

const page = (ids: string[]) => ({ body: { data: ids.map((id) => ({ id, form: "1234567" })) } });
const params = { formId: "1234567" };

test("new-submission-poll: first check seeds without emitting", async () => {
  const seed = await trigger.poll!(
    { params, state: {}, subscriptionId: "sub" },
    mockCtx([page(["3", "2", "1"])]).ctx,
  );
  assertEquals(seed.events, []);
  assertEquals(seed.nextState?.seeded, true);
});

test("new-submission-poll: a later check emits only the unseen submission", async () => {
  const seed = await trigger.poll!(
    { params, state: {}, subscriptionId: "sub" },
    mockCtx([page(["2", "1"])]).ctx,
  );
  const next = await trigger.poll!(
    { params, state: seed.nextState!, subscriptionId: "sub" },
    mockCtx([page(["3", "2", "1"])]).ctx,
  );
  assertEquals(next.events, [{ id: "3", form: "1234567" }]);
});

test("new-submission-poll: the same state and response twice give identical results", async () => {
  const seed = await trigger.poll!(
    { params, state: {}, subscriptionId: "sub" },
    mockCtx([page(["2", "1"])]).ctx,
  );
  const run = () =>
    trigger.poll!(
      { params, state: seed.nextState!, subscriptionId: "sub" },
      mockCtx([page(["4", "3", "2", "1"])]).ctx,
    );
  assertEquals(await run(), await run());
});

test("new-submission-poll: requests the submission-list endpoint newest-first (literal)", async () => {
  const m = mockCtx([page(["1"])]);
  await trigger.poll!({ params, state: {}, subscriptionId: "sub" }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(
    m.calls[0].url,
    "https://www.formstack.com/api/v2025/forms/1234567/submissions?data=true&order=DESC&pageSize=50",
  );
});

test("new-submission-poll: is a poll with output, a sample and no onSubscribe", () => {
  assertEquals(trigger.poll !== undefined && trigger.onSubscribe === undefined, true);
  assertEquals(Array.isArray(trigger.output) && trigger.output.length > 0, true);
  assertEquals(trigger.sample !== undefined, true);
});
