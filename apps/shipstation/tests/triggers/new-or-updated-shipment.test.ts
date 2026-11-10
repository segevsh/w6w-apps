import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-shipment.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ship = (id: string, modified = "2026-11-09T09:00:00.000Z") => ({
  shipment_id: id,
  created_at: "2026-11-09T09:00:00.000Z",
  modified_at: modified,
});
const page = (shipments: unknown[]) => ({
  body: { shipments, total: shipments.length, page: 1, pages: 1 },
});
const next = (r: unknown) => (r as { nextState: unknown }).nextState;
const events = (r: unknown) => (r as { events: unknown[] }).events;

test("new-or-updated-shipment: seeds without emitting", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} } as never,
    mockCtx([page([ship("se-1")])]).ctx,
  );
  assertEquals(events(seeded), []);
  assertEquals((next(seeded) as { seeded?: boolean }).seeded, true);
});

test("new-or-updated-shipment: emits only the unseen shipment and is idempotent on retry", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} } as never,
    mockCtx([page([ship("se-1")])]).ctx,
  );
  const items = [ship("se-2"), ship("se-1")];
  const first = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([page(items)]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([page(items)]).ctx,
  );
  assertEquals(events(first), [ship("se-2")]);
  assertEquals(retry, first);
});

test("new-or-updated-shipment: requests shipments sorted by modified_at desc", async () => {
  const c = mockCtx([page([ship("se-1")])]);
  await trigger.poll!({ ...input, state: {} } as never, c.ctx);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(
    c.calls[0].url,
    "https://api.shipstation.com/v2/shipments?sort_by=modified_at&sort_dir=desc&page=1&page_size=100",
  );
});

test("new-or-updated-shipment: an edited shipment (same id, new modified_at) is emitted again", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} } as never,
    mockCtx([page([ship("se-1")])]).ctx,
  );
  const edited = ship("se-1", "2026-11-10T09:00:00.000Z");
  const r = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([page([edited, ship("se-1")])]).ctx,
  );
  assertEquals(events(r), [edited]);
});
