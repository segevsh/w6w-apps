import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-destination.ts";
const page = (data: unknown[]) => ({ data });
test("new-destination seeds, emits, retries, and requests the bounded first page", async () => {
  const input = { params: {}, subscriptionId: "s" };
  const display = { display: { host: "https://api.airbyte.com" } };
  const seed = mockCtx([{ body: page([{ destinationId: "a" }]) }], display);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(seed.calls[0].url, "https://api.airbyte.com/v1/destinations?limit=1000&offset=0");
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page([{ destinationId: "b" }, { destinationId: "a" }]) }], display).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page([{ destinationId: "b" }, { destinationId: "a" }]) }], display).ctx,
  );
  assertEquals(first.events, [{
    destinationId: "b",
    name: undefined,
    destinationType: undefined,
    workspaceId: undefined,
  }]);
  assertEquals(retry, first);
});
