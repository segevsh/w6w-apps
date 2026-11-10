import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-template.ts";

const conn = { display: { baseUrl: "https://live-mt-server.wati.io/12345" } };
const base = "https://live-mt-server.wati.io/12345/api/ext/v3/messageTemplates";
const item = (id: string) => ({ id, name: `Template ${id}`, status: "APPROVED" });
const res = (ids: string[], total = ids.length) => ({ body: { templates: ids.map(item), total } });
const poll = async (state: unknown, responses: Array<{ body: unknown }>) => {
  const m = mockCtx(responses, conn);
  const r = await trigger.poll!({ params: {}, state, subscriptionId: "s" }, m.ctx);
  return { r, calls: m.calls };
};

test("new-template: seeds, emits only added templates, retries idempotently, literal request", async () => {
  const seeded = await poll({}, [res(["a"])]);
  assertEquals(seeded.r.events, []);
  assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seeded.calls[0].method, "GET");
  assertEquals(seeded.calls[0].url, `${base}?page_number=1&page_size=100`);
  const first = await poll(seeded.r.nextState, [res(["a", "b"])]);
  const retry = await poll(seeded.r.nextState, [res(["a", "b"])]);
  assertEquals(first.r.events, [item("b")]);
  assertEquals(retry.r, first.r);
});

test("new-template: reads every page of a collection larger than one page", async () => {
  const full = Array.from({ length: 100 }, (_, i) => `t${i}`);
  const seeded = await poll({}, [res(full, 101), res(["t100"], 101)]);
  assertEquals(seeded.calls.map((c) => c.url), [
    `${base}?page_number=1&page_size=100`,
    `${base}?page_number=2&page_size=100`,
  ]);
  const next = await poll(seeded.r.nextState, [res(full, 102), res(["t100", "t101"], 102)]);
  assertEquals(next.r.events, [item("t101")]);
});
