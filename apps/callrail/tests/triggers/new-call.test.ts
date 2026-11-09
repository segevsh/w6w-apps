import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-call.ts";

test("new-call seeds, emits once, retries idempotently, and requests the newest calls", async () => {
  const params = { accountId: "ACC1" };
  const seeded = await trigger.poll!(
    { params, state: {} },
    mockCtx([{ body: listEnvelope("calls", [{ id: "a" }]) }]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const page = { body: listEnvelope("calls", [{ id: "b" }, { id: "a" }]) };
  const first = mockCtx([page]);
  const emitted = await trigger.poll!({ params, state: seeded.nextState }, first.ctx);
  assertEquals(emitted.events, [{ id: "b" }]);
  assertEquals({
    method: first.calls[0].method,
    path: new URL(first.calls[0].url).pathname,
    query: Object.fromEntries(new URL(first.calls[0].url).searchParams),
  }, {
    method: "GET",
    path: "/v3/a/ACC1/calls.json",
    query: { sort: "start_time", order: "desc", page: "1", per_page: "100" },
  });
  assertEquals(
    await trigger.poll!({ params, state: seeded.nextState }, mockCtx([page]).ctx),
    emitted,
  );
});
