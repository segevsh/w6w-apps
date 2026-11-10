import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-pipeline.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const pipe = (id: number) => ({ id, name: `pipeline ${id}` });
const ctx = (data: unknown[]) => mockCtx([{ body: { success: true, data } }]);

test("new-pipeline: seeds without flooding and requests the pipelines", async () => {
  const seed = ctx([pipe(1)]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.sendpulse.com/crm/v1/pipelines");
});

test("new-pipeline: emits only the pipeline that was added", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([pipe(1)]).ctx);
  const result = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([pipe(1), pipe(2)]).ctx,
  );
  assertEquals(result.events, [pipe(2)]);
});

test("new-pipeline: the same state and responses give the same result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([pipe(1)]).ctx);
  const data = [pipe(1), pipe(2)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(data).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(data).ctx);
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

test("new-pipeline: a renamed existing pipeline is not a new pipeline", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([pipe(1)]).ctx);
  const result = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([{ ...pipe(1), name: "renamed" }]).ctx,
  );
  assertEquals(result.events, []);
});
