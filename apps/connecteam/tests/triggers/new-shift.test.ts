import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pagedEnvelope } from "../_helpers.ts";
import trigger from "../../triggers/new-shift.ts";

const params = { schedulerId: 10, startTime: 1, endTime: 2 };
const page = (shifts: unknown[]) => ({ body: pagedEnvelope({ shifts }) });
test("new-shift seeds, emits once, retries idempotently, and requests newest shifts", async () => {
  const seeded = await trigger.poll!({ params, state: {} }, mockCtx([page([{ id: "a" }])]).ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const next = page([{ id: "b" }, { id: "a" }]);
  const first = mockCtx([next]);
  const emitted = await trigger.poll!({ params, state: seeded.nextState }, first.ctx);
  assertEquals(emitted.events, [{ id: "b" }]);
  assertEquals({
    method: first.calls[0].method,
    path: new URL(first.calls[0].url).pathname,
    query: Object.fromEntries(new URL(first.calls[0].url).searchParams),
  }, {
    method: "GET",
    path: "/scheduler/v2/schedulers/10/shifts",
    query: {
      startTime: "1",
      endTime: "2",
      sort: "created_at",
      order: "desc",
      limit: "100",
      offset: "0",
    },
  });
  assertEquals(
    await trigger.poll!({ params, state: seeded.nextState }, mockCtx([next]).ctx),
    emitted,
  );
});
