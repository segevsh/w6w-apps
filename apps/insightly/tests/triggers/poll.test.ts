import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockInsightlyCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import contact from "../../triggers/new-contact.ts";
import lead from "../../triggers/new-lead.ts";
import opportunity from "../../triggers/new-opportunity.ts";
import organisation from "../../triggers/new-organisation.ts";
import contactU from "../../triggers/new-or-updated-contact.ts";
import leadU from "../../triggers/new-or-updated-lead.ts";
import opportunityU from "../../triggers/new-or-updated-opportunity.ts";
import organisationU from "../../triggers/new-or-updated-organisation.ts";

const T0 = Date.parse("2026-11-09T10:00:00Z");
const T1 = Date.parse("2026-11-09T10:05:00Z");
const input = { params: {}, subscriptionId: "sub-1" };

const rows = [
  { t: contact, u: contactU, path: "/v3.1/Contacts/Search", id: "CONTACT_ID" },
  { t: lead, u: leadU, path: "/v3.1/Leads/Search", id: "LEAD_ID" },
  { t: opportunity, u: opportunityU, path: "/v3.1/Opportunities/Search", id: "OPPORTUNITY_ID" },
  { t: organisation, u: organisationU, path: "/v3.1/Organisations/Search", id: "ORGANISATION_ID" },
];

const rec = (id: string, n: number, created: string, updated: string) => ({
  [id]: n,
  DATE_CREATED_UTC: created,
  DATE_UPDATED_UTC: updated,
});

for (const { t, u, path, id } of rows) {
  for (const trig of [t, u]) {
    test(`${trig.key}: seeds, emits the new record, retries idempotently, requests the literal Search`, async () => {
      clock.now = () => T0;
      const old = rec(id, 1, "2026-11-01 08:00:00", "2026-11-09 09:59:00");
      const seeded = await trig.poll!({ ...input, state: {} }, mockInsightlyCtx([]).ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

      clock.now = () => T1;
      const fresh = rec(id, 2, "2026-11-09 10:03:00", "2026-11-09 10:03:00");
      const run = () =>
        trig.poll!(
          { ...input, state: seeded.nextState },
          mockInsightlyCtx([{ body: [old, fresh] }]).ctx,
        );
      const checkCtx = mockInsightlyCtx([{ body: [old, fresh] }]);
      const first = await trig.poll!({ ...input, state: seeded.nextState }, checkCtx.ctx);
      assertEquals(
        checkCtx.calls[0].url,
        `https://api.na1.insightly.com${path}?updated_after_utc=2026-11-09T09%3A58%3A00Z&top=500&skip=0`,
      );
      assertEquals(checkCtx.calls[0].method, "GET");
      const retry = await run();
      assertEquals(first.events, [fresh]);
      assertEquals(retry, first);
      assertEquals((first.nextState as { cursor: number }).cursor, T1);
    });
  }

  test(`${t.key} drops an edited old record; ${u.key} emits it again as an update`, async () => {
    clock.now = () => T0;
    const before = rec(id, 1, "2026-11-01 08:00:00", "2026-11-09 09:59:00");
    const seededNew = await t.poll!(
      { ...input, state: {} },
      mockInsightlyCtx([{ body: [before] }]).ctx,
    );
    const seededUpd = await u.poll!(
      { ...input, state: {} },
      mockInsightlyCtx([{ body: [before] }]).ctx,
    );
    clock.now = () => T1;
    const edited = rec(id, 1, "2026-11-01 08:00:00", "2026-11-09 10:04:00");
    const n = await t.poll!(
      { ...input, state: seededNew.nextState },
      mockInsightlyCtx([{ body: [edited] }]).ctx,
    );
    const up = await u.poll!(
      { ...input, state: seededUpd.nextState },
      mockInsightlyCtx([{ body: [edited] }]).ctx,
    );
    assertEquals(n.events, []);
    assertEquals(up.events, [edited]);
  });
}

test("a full page is followed by skip=500 and every page is read", async () => {
  clock.now = () => T0;
  const seeded = await contact.poll!({ ...input, state: {} }, mockInsightlyCtx([]).ctx);
  clock.now = () => T1;
  const full = Array.from(
    { length: 500 },
    (_, i) => rec("CONTACT_ID", i + 1, "2026-11-09 10:01:00", "2026-11-09 10:01:00"),
  );
  const extra = rec("CONTACT_ID", 900, "2026-11-09 10:02:00", "2026-11-09 10:02:00");
  const { ctx, calls } = mockInsightlyCtx([{ body: full }, { body: [extra] }]);
  const out = await contact.poll!({ ...input, state: seeded.nextState }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(new URL(calls[1].url).searchParams.get("skip"), "500");
  assertEquals(out.events.length, 501);
});
