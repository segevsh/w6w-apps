import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-survey.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const survey = (id: string) => ({ id, name: `Survey ${id}` });

test("new-survey: seeds, emits additions, retries idempotently, and lists surveys", async () => {
  const seededCtx = mockCtx([{ body: { data: [survey("a")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seededCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seededCtx.calls[0].method, "GET");
  assertEquals(seededCtx.calls[0].url, "https://app.formbricks.com/api/v1/management/surveys");
  const next = [survey("a"), survey("b")];
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: { data: next } }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: { data: next } }]).ctx,
  );
  assertEquals(first.events, [{ change: "added", key: "b", values: survey("b") }]);
  assertEquals(retry, first);
});
