import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-datapoint.ts";

const input = { params: { slug: "w" }, subscriptionId: "sub-1" };
const ctx = (items: unknown[]) =>
  mockCtx([{
    body: items.map((i) => ({
      ...(i as object),
      timestamp: 1,
      daystamp: "20261109",
      value: 1,
      comment: "",
      requestid: "r",
      updated_at: 2,
    })),
  }]);
const item = (id: string) => ({
  id,
  timestamp: 1,
  daystamp: "20261109",
  value: 1,
  comment: "",
  requestId: "r",
  updatedAt: 2,
});

test("new-datapoint: seeds, emits only new items, retries idempotently, requests newest first", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://www.beeminder.com/api/v1/users/me/goals/w/datapoints.json?sort=id&count=100",
  );

  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
