import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-dashboard.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const dashboard = (uid: string) => ({ uid, title: uid });
const display = { endpoint: "https://example.grafana.net" };

test("new-dashboard seeds, emits an added dashboard, retries idempotently, and requests the bounded list", async () => {
  const seedCtx = mockCtx([{ body: [dashboard("a")] }], { display });
  const seeded = await trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seedCtx.calls[0].method, "GET");
  assertEquals(
    seedCtx.calls[0].url,
    "https://example.grafana.net/api/search?type=dash-db&limit=5000",
  );

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: [dashboard("b"), dashboard("a")] }], { display }).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: [dashboard("b"), dashboard("a")] }], { display }).ctx,
  );
  assertEquals(first.events, [{ change: "added", key: "b", values: dashboard("b") }]);
  assertEquals(retry, first);
});
