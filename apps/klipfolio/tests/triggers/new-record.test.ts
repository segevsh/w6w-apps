import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newDashboard from "../../triggers/new-dashboard.ts";
import newDataSource from "../../triggers/new-data-source.ts";

const input = { params: {}, subscriptionId: "sub-1" };

const cases = [
  {
    trigger: newDashboard,
    envKey: "tabs",
    url: "https://app.klipfolio.com/api/1.0/tabs?limit=100&offset=0",
  },
  {
    trigger: newDataSource,
    envKey: "datasources",
    url: "https://app.klipfolio.com/api/1.0/datasources?limit=100&offset=0",
  },
];

for (const { trigger, envKey, url } of cases) {
  const rec = (id: string) => ({ id, name: `Record ${id}` });
  const page = (...ids: string[]) => ({
    body: {
      data: { [envKey]: ids.map(rec) },
      meta: { success: true, count: ids.length, total: ids.length },
    },
  });

  test(`${trigger.key}: seeds, emits additions, retries idempotently, and requests ${envKey}`, async () => {
    const seed = mockCtx([page("a")]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, url);
    const run = () =>
      trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([page("a", "b")]).ctx);
    const first = await run();
    assertEquals(first.events, [{ change: "added", key: "b", values: rec("b") }]);
    assertEquals(await run(), first);
  });
}
