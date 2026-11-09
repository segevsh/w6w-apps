import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-device.ts";

const response = (d: unknown[]) => ({ body: { d } });

test("new-device seeds, emits, retries, and requests the bounded device list", async () => {
  const seed = await trigger.poll!(
    { params: {}, state: {} },
    mockCtx([response([{ id: 1, uuid: "a" }])]).ctx,
  );
  assertEquals(seed.events, []);
  const nextCtx = mockCtx([response([{ id: 2, uuid: "b" }, { id: 1, uuid: "a" }])]);
  const next = await trigger.poll!({ params: {}, state: seed.nextState }, nextCtx.ctx);
  assertEquals(next.events, [{ id: 2, uuid: "b" }]);
  const retry = await trigger.poll!(
    { params: {}, state: seed.nextState },
    mockCtx([response([{ id: 2, uuid: "b" }, { id: 1, uuid: "a" }])]).ctx,
  );
  assertEquals(retry, next);
  assertEquals(new URL(nextCtx.calls[0].url).pathname, "/v7/device");
  assertEquals(new URL(nextCtx.calls[0].url).searchParams.get("$top"), "1000");
});
