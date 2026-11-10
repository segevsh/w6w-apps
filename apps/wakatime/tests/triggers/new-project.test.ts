import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-project.ts";

const params = {};
const item = (id: string) => ({ id, name: `Project ${id}` });
const res = (ids: string[]) => ({ body: { data: ids.map(item) } });
const poll = async (state: unknown, responses: Array<{ body: unknown }>) => {
  const m = mockCtx(responses);
  const r = await trigger.poll!({ params, state, subscriptionId: "s" }, m.ctx);
  return { r, calls: m.calls };
};

test("new-project: seeds, emits only added items, retries idempotently, literal request", async () => {
  const seeded = await poll({}, [res(["a"])]);
  assertEquals(seeded.r.events, []);
  assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seeded.calls[0].method, "GET");
  assertEquals(seeded.calls[0].url, "https://api.wakatime.com/api/v1/users/current/projects");
  assertEquals(seeded.calls[0].body, null);
  const first = await poll(seeded.r.nextState, [res(["a", "b"])]);
  const retry = await poll(seeded.r.nextState, [res(["a", "b"])]);
  assertEquals(first.r.events, [item("b")]);
  assertEquals(retry.r, first.r);
});

test("new-project: a removed or edited item is not an event", async () => {
  const seeded = await poll({}, [res(["a", "b"])]);
  const next = await poll(seeded.r.nextState, [
    { body: { data: [{ ...item("a"), name: "Renamed" }] } },
  ]);
  assertEquals(next.r.events, []);
});
