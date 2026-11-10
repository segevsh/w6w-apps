import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-activity.ts";

const ORG = "11111111-2222-3333-4444-555555555555";
const T0 = Date.parse("2026-11-09T12:00:00Z");
const T1 = T0 + 300_000;
const input = { params: {}, subscriptionId: "sub-1" };
const at = (ms: number) => new Date(ms).toISOString();
const item = (id: string, ms: number) => ({
  id,
  type: "SERVICE_CREATED",
  actorType: "user",
  createdAt: at(ms),
});
const ctx = (items: unknown[]) =>
  mockCtx([{ status: 200, body: { result: items } }], {
    display: { organizationId: ORG, plane: "control" },
  });

test("new-activity: seeds the cursor without emitting", async () => {
  clock.now = () => T0;
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a", T0 - 60_000)]).ctx);
  assertEquals(seeded.events, []);
  const st = seeded.nextState as { seeded?: boolean; cursor?: number };
  assertEquals(st.seeded, true);
  assertEquals(st.cursor, T0);
});

test("new-activity: emits only the unseen event, retries idempotently", async () => {
  clock.now = () => T0;
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a", T0 - 60_000)]).ctx);
  clock.now = () => T1;
  const fresh = item("b", T1 - 30_000);
  const page = [item("a", T0 - 60_000), fresh];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [fresh]);
  assertEquals(retry, first);
});

test("new-activity: asks the activities endpoint for events since cursor minus 120 s", async () => {
  clock.now = () => T0;
  const seed = ctx([]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    new URL(seed.calls[0].url).pathname,
    "/v1/organizations/11111111-2222-3333-4444-555555555555/activities",
  );
  assertEquals(
    new URL(seed.calls[0].url).searchParams.get("from_date"),
    "2026-11-09T11:58:00.000Z",
  );
  clock.now = () => T1;
  const next = ctx([]);
  await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
  assertEquals(
    new URL(next.calls[0].url).searchParams.get("from_date"),
    "2026-11-09T11:58:00.000Z",
  );
});
