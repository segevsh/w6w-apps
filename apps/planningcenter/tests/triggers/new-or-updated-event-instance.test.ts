import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-event-instance.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const inst = (id: string, updated = "2026-11-10T09:00:00Z") => ({
  id,
  attributes: {
    starts_at: "2026-12-01T00:00:00Z",
    created_at: "2026-11-10T09:00:00Z",
    updated_at: updated,
  },
});

test("new-or-updated-event-instance: seeds without emitting and requests the updated_at-descending feed", async () => {
  const seed = mockCtx([{ body: { data: [inst("instance-1")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.planningcenteronline.com/calendar/v2/event_instances?per_page=100&offset=0&order=-updated_at",
  );
});

test("new-or-updated-event-instance: emits a new and an edited occurrence; retry is idempotent", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { data: [inst("instance-1")] } }]).ctx,
  );
  const page = {
    data: [inst("instance-2", "2026-11-10T10:00:00Z"), inst("instance-1", "2026-11-10T10:05:00Z")],
  };
  const run = () =>
    trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body: page }]).ctx);
  const first = await run();
  assertEquals(first.events.length, 2);
  assertEquals(await run(), first);
});

test("new-or-updated-event-instance: an unchanged occurrence is not re-emitted", async () => {
  const body = { data: [inst("instance-1")] };
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([{ body }]).ctx);
  const res = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body }]).ctx);
  assertEquals(res.events, []);
});
