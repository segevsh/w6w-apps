import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { CONN, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-message.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string, at: string) => ({ message_uuid: id, message_time: at });
const page = (...items: unknown[]) => [{ body: { api_id: "a", meta: {}, objects: items } }];

test("new-message: seeds without emitting and requests the first page unfiltered", async () => {
  const seed = mockCtx(page(item("a", "2026-11-09 13:04:06.799021+05:30")), CONN);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.plivo.com/v1/Account/MA_TEST/Message/?limit=20&offset=0",
  );
});

test("new-message: after the seed, asks for records since the cursor and emits only the new one", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx(page(item("a", "2026-11-09 13:04:06.799021+05:30")), CONN).ctx,
  );
  const next = mockCtx(
    page(
      item("b", "2026-11-09 13:10:00.000000+05:30"),
      item("a", "2026-11-09 13:04:06.799021+05:30"),
    ),
    CONN,
  );
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
  assertEquals(first.events, [item("b", "2026-11-09 13:10:00.000000+05:30")]);
  assertEquals(next.calls[0].method, "GET");
  assertEquals(
    next.calls[0].url,
    "https://api.plivo.com/v1/Account/MA_TEST/Message/?message_time__gt=2026-11-09+07%3A32%3A06&limit=20&offset=0",
  );
});

test("new-message: the same state and responses give the same result (idempotent retry)", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx(page(item("a", "2026-11-09 13:04:06.799021+05:30")), CONN).ctx,
  );
  const run = () =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx(
        page(
          item("b", "2026-11-09 13:10:00.000000+05:30"),
          item("a", "2026-11-09 13:04:06.799021+05:30"),
        ),
        CONN,
      ).ctx,
    );
  assertEquals(await run(), await run());
});
