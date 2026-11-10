import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-check-result.ts";
import { clock } from "../../lib/since.ts";

const NOW = Date.UTC(2026, 10, 9, 10, 0, 0);
const input = { params: { checkId: "chk-1", failuresOnly: true }, subscriptionId: "sub-1" };
const res = (id: string) => ({ id, checkId: "chk-1", hasFailures: true });
const page = (...rows: unknown[]) => mockCtx([{ body: rows }]);

test("new-check-result: seeds, emits only new, retries idempotently, filters by from/FINAL", async () => {
  clock.now = () => NOW;
  const seed = page(res("a"));
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.checklyhq.com/v1/check-results/chk-1?hasFailures=true&resultType=FINAL&from=1794218280&limit=100&page=1",
  );

  const rows = [res("b"), res("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  assertEquals(first.events, [res("b")]);
  assertEquals(retry, first);
});
