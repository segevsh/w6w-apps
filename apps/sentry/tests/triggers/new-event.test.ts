import { afterEach, describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newEvent from "../../triggers/new-event.ts";
import newIssueEvent from "../../triggers/new-issue-event.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const T0 = Date.parse("2026-11-10T10:00:00Z");
const OLD = "2026-11-10T09:00:00Z";
const NEW = "2026-11-10T10:03:00Z";
const display = { organization: "acme", organizationSlug: "acme" };
const base = "https://us.sentry.io/api/0";
const ev = (id: string, dateCreated: string) => ({ eventID: id, title: "boom", dateCreated });

const cases = [
  {
    name: "new-event",
    trigger: newEvent,
    params: { organizationSlug: "acme", projectSlug: "backend" },
    path: "/projects/acme/backend/events/",
  },
  {
    name: "new-issue-event",
    trigger: newIssueEvent,
    params: { organizationSlug: "acme", issueId: "77" },
    path: "/organizations/acme/issues/77/events/",
  },
];

for (const c of cases) {
  const input = (state: unknown) => ({ params: c.params, subscriptionId: "s", state });
  // Literal window: start = last check - 120 s, end = this check, both whole-second ISO stamps.
  const url = (start: string, end: string, extra = "") =>
    `${base}${c.path}?start=${start}&end=${end}&per_page=100${extra}`;
  describe(c.name, () => {
    test("seeds, emits the new event, retries identically, sends the literal request", async () => {
      clock.now = () => T0;
      const seed = mockCtx([{ body: [ev("e1", OLD)] }], { display });
      const seeded = await c.trigger.poll!(input({}), seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(seed.calls[0].url, url("2026-11-10T09%3A58%3A00Z", "2026-11-10T10%3A00%3A00Z"));
      clock.now = () => T0 + 300_000;
      const run = () => mockCtx([{ body: [ev("e2", NEW), ev("e1", OLD)] }], { display });
      const first = run();
      const out = await c.trigger.poll!(input(seeded.nextState), first.ctx);
      const retry = await c.trigger.poll!(input(seeded.nextState), run().ctx);
      assertEquals(out.events, [ev("e2", NEW)]);
      assertEquals(retry, out);
      assertEquals(first.calls[0].url, url("2026-11-10T09%3A58%3A00Z", "2026-11-10T10%3A05%3A00Z"));
    });

    test("drains every Link page of a window inside one check", async () => {
      clock.now = () => T0;
      const seeded = await c.trigger.poll!(input({}), mockCtx([{ body: [] }], { display }).ctx);
      clock.now = () => T0 + 300_000;
      const headers = {
        "content-type": "application/json",
        link: `<${base}${c.path}?cursor=c2>; rel="next"; results="true"; cursor="c2"`,
      };
      const run = mockCtx([
        { body: [ev("a", NEW), ev("b", NEW)], headers },
        { body: [ev("c", NEW)] },
      ], { display });
      const out = await c.trigger.poll!(input(seeded.nextState), run.ctx);
      assertEquals(out.events.length, 3);
      assertEquals(
        run.calls[1].url,
        url("2026-11-10T09%3A58%3A00Z", "2026-11-10T10%3A05%3A00Z", "&cursor=c2"),
      );
      assertEquals((out.nextState as { cursor: number }).cursor, T0 + 300_000);
    });

    test("never emits a pre-seed event (floor), then emits one created after the seed", async () => {
      clock.now = () => T0;
      const seeded = await c.trigger.poll!(input({}), mockCtx([{ body: [] }], { display }).ctx);
      assertEquals((seeded.nextState as { floor?: number }).floor, T0);
      clock.now = () => T0 + 300_000;
      const one = await c.trigger.poll!(
        input(seeded.nextState),
        mockCtx([{ body: [ev("old", OLD)] }], { display }).ctx,
      );
      assertEquals(one.events, []);
      clock.now = () => T0 + 600_000;
      const two = await c.trigger.poll!(
        input(one.nextState),
        mockCtx([{ body: [ev("fresh", NEW)] }], { display }).ctx,
      );
      assertEquals(two.events, [ev("fresh", NEW)]);
    });
  });
}
