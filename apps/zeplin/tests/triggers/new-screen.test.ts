import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-screen.ts";

const params = { projectId: "p1" };
const base = "https://api.zeplin.dev/v1/projects/p1/screens";
const item = (id: string) => ({ id, name: `Screen ${id}`, created: 1517184000 });
const res = (ids: string[]) => ({ body: ids.map(item) });
const poll = async (state: unknown, responses: Array<{ body: unknown }>) => {
  const m = mockCtx(responses);
  const r = await trigger.poll!({ params, state, subscriptionId: "s" }, m.ctx);
  return { r, calls: m.calls };
};

test("new-screen: seeds, emits only added screens, retries idempotently, literal request", async () => {
  const seeded = await poll({}, [res(["a"])]);
  assertEquals(seeded.r.events, []);
  assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seeded.calls[0].method, "GET");
  assertEquals(seeded.calls[0].url, `${base}?limit=100&offset=0`);
  const first = await poll(seeded.r.nextState, [res(["a", "b"])]);
  const retry = await poll(seeded.r.nextState, [res(["a", "b"])]);
  assertEquals(first.r.events, [item("b")]);
  assertEquals(retry.r, first.r);
});

test("new-screen: reads every page of a project with more than 100 screens", async () => {
  const full = Array.from({ length: 100 }, (_, i) => `s${i}`);
  const seeded = await poll({}, [res(full), res(["s100"])]);
  assertEquals(seeded.calls.map((c) => c.url), [
    `${base}?limit=100&offset=0`,
    `${base}?limit=100&offset=100`,
  ]);
  const next = await poll(seeded.r.nextState, [res(full), res(["s100", "s101"])]);
  assertEquals(next.r.events, [item("s101")]);
});

test("new-screen: does not depend on the vendor's sort direction", async () => {
  const seeded = await poll({}, [res(["a", "b"])]);
  const reversed = await poll(seeded.r.nextState, [res(["b", "c", "a"])]);
  assertEquals(reversed.r.events, [item("c")]);
});
