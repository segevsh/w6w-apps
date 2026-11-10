import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-device.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const dev = (id: string, lastHeard = "2026-11-09T10:00:00.000Z") => ({
  id,
  name: `d-${id}`,
  last_heard: lastHeard,
});
const ctx = (devices: unknown[]) => mockCtx([{ body: devices }]);

test("new-device: seeds, emits only newly claimed devices, retries idempotently, lists /v1/devices", async () => {
  const seed = ctx([dev("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.particle.io/v1/devices");

  // A device that merely reconnected (new last_heard) is not new; a new id is.
  const page = [dev("b"), dev("a", "2026-11-09T12:00:00.000Z")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [dev("b")]);
  assertEquals(retry, first);
});
