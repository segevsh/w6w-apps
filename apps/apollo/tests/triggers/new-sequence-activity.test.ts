import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-sequence-activity.ts";

const input = { params: { contact_id: "contact-1" }, subscriptionId: "s" };
const event = (type: string, at: string) => ({
  type,
  occurred_at: at,
  sequence_id: "seq-1",
  sequence_name: "Q2 Outreach",
});
const older = event("enrolled", "2026-07-20T10:00:00Z");
const newer = event("replied", "2026-07-26T10:26:55Z");

test("new-sequence-activity seeds, emits only the new event, retries identically", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { contact_id: "contact-1", events: [older] } }]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  const run = () =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: { contact_id: "contact-1", events: [newer, older] } }]).ctx,
    );
  const first = await run();
  assertEquals(first.events, [newer]);
  assertEquals(await run(), first);
});

test("new-sequence-activity posts the literal activity-feed request for the chosen contact", async () => {
  const mock = mockCtx([{ body: { events: [] } }]);
  await trigger.poll!({ ...input, state: {} }, mock.ctx);
  assertEquals(mock.calls.length, 1);
  assertEquals(mock.calls[0].method, "POST");
  assertEquals(mock.calls[0].url, "https://api.apollo.io/api/v1/emailer_campaigns/activity_feed");
  assertEquals(JSON.parse(mock.calls[0].body!), { contact_id: "contact-1", per_page: 50 });

  const scoped = mockCtx([{ body: { events: [] } }]);
  await trigger.poll!(
    { params: { contact_id: "contact-1", sequence_id: "seq-1" }, subscriptionId: "s", state: {} },
    scoped.ctx,
  );
  assertEquals(JSON.parse(scoped.calls[0].body!), {
    contact_id: "contact-1",
    sequence_id: "seq-1",
    per_page: 50,
  });
});
