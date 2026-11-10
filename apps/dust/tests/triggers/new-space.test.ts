import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtxWithConnection } from "../_helpers.ts";
import trigger from "../../triggers/new-space.ts";

const input = { params: {}, subscriptionId: "sub_1" };
const space = (sId: string) => ({ sId, name: `Space ${sId}`, kind: "regular" });

test("new-space: seeds, emits only added spaces, retries idempotently, and requests GET /spaces", async () => {
  const seed = mockCtxWithConnection([{ body: { spaces: [space("a")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const response = { body: { spaces: [space("a"), space("b")] } };
  const first = mockCtxWithConnection([response]);
  const retry = mockCtxWithConnection([response]);
  const result = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
  const repeated = await trigger.poll!({ ...input, state: seeded.nextState }, retry.ctx);
  assertEquals(result.events, [space("b")]);
  assertEquals(repeated.events, result.events);
  assertEquals(first.calls[0].method, "GET");
  assertEquals(first.calls[0].url, "https://dust.tt/api/v1/w/ws_test123/spaces");
});
