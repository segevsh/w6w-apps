import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-event-instance.ts";

const input = { params: {}, subscriptionId: "sub-1" };
test("new-event-instance: seeds, emits new records, retries idempotently, and requests the feed", async () => {
  const seed = mockCtx([{
    body: { data: [{ id: "instance-1", attributes: { starts_at: "2026-01-01T00:00:00Z" } }] },
  }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.planningcenteronline.com/calendar/v2/event_instances?per_page=100&offset=0&order=starts_at&where%5Bstarts_at%5D%5Bgte%5D=2026-01-01T00%3A00%3A00Z",
  );
  const page = {
    data: [{ id: "instance-2", attributes: { starts_at: "2026-01-02T00:00:00Z" } }, {
      id: "instance-1",
      attributes: { starts_at: "2026-01-01T00:00:00Z" },
    }],
  };
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page }]).ctx,
  );
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});
