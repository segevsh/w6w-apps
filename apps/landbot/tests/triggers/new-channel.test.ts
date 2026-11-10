import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import trigger from "../../triggers/new-channel.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const channel = (id: number) => ({ id, name: `Channel ${id}`, type: "landbot" });
const page = (...ids: number[]) => ({
  body: { success: true, total: ids.length, channels: ids.map(channel) },
});

test("new-channel: seeds, emits additions, retries idempotently, and requests /channels/", async () => {
  const seed = mockCtx([page(1)]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(pathOf(seed.calls[0].url), "/v1/channels/");
  assertEquals(queryOf(seed.calls[0].url), { offset: "0", limit: "100" });
  const run = () => trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([page(1, 2)]).ctx);
  const first = await run();
  assertEquals(first.events, [{ change: "added", key: "2", values: channel(2) }]);
  assertEquals(await run(), first);
});
