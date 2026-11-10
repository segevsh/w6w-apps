import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-incident.ts";
import { clock } from "../../lib/since.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const NOW = Date.UTC(2026, 10, 9, 10, 0, 0);
const inc = (id: string) => ({ id: id, type: "incident", attributes: { name: id } });
const page = (...data: unknown[]) => mockCtx([{ body: { data, pagination: { next: null } } }]);

test("new-incident: seeds, emits only new, retries idempotently, filters by from date", async () => {
  clock.now = () => NOW;
  const seed = page(inc("1"));
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://uptime.betterstack.com/api/v3/incidents?from=2026-11-09&page=1&per_page=50",
  );

  const rows = [inc("2"), inc("1")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  assertEquals(first.events.map((e) => (e as { id: string }).id), ["2"]);
  assertEquals(retry, first);
});
