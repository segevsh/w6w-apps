import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-event.ts";
import { clock } from "../../lib/since.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const NOW = Date.UTC(2026, 10, 9, 10, 0, 0);
const event = (id: string) => ({ id });

test("new-event: seeds, emits only new events, retries idempotently, windows by start", async () => {
  clock.now = () => NOW;
  const seed = mockCtx([{ body: { data: [event("a")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.bitwarden.com/public/events?start=2026-11-09T09%3A58%3A00.000Z",
  );

  const response = { data: [event("b"), event("a")] };
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: response }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: response }]).ctx,
  );
  assertEquals(first.events, [event("b")]);
  assertEquals(retry, first);
});

test("new-event: follows the continuation token whatever order pages come in", async () => {
  clock.now = () => NOW;
  const ctx = mockCtx([
    { body: { data: [event("a")], continuationToken: "tok" } },
    { body: { data: [event("c"), event("b")] } },
  ]);
  const prior = { v: 1, kind: "ids", seeded: true, ids: ["a"], cursor: NOW - 300_000 };
  const out = await trigger.poll!({ ...input, state: prior }, ctx.ctx);
  assertEquals(out.events.length, 2);
  assertEquals(ctx.calls[1].url.includes("continuationToken=tok"), true);
});
