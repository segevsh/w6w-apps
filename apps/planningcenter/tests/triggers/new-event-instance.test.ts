import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-event-instance.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const inst = (id: string, updated = "2026-11-10T09:00:00Z") => ({
  id,
  attributes: {
    starts_at: "2026-12-01T00:00:00Z",
    created_at: "2026-11-10T09:00:00Z",
    updated_at: updated,
  },
});

test("new-event-instance: seeds without emitting and requests the created_at-descending feed", async () => {
  const seed = mockCtx([{ body: { data: [inst("instance-1")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.planningcenteronline.com/calendar/v2/event_instances?per_page=100&offset=0&order=-created_at",
  );
});

test("new-event-instance: emits only the unseen occurrence; retry is idempotent", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { data: [inst("instance-1")] } }]).ctx,
  );
  const page = { data: [inst("instance-2"), inst("instance-1")] };
  const run = () =>
    trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body: page }]).ctx);
  const first = await run();
  assertEquals(first.events.length, 1);
  assertEquals(await run(), first);
});
