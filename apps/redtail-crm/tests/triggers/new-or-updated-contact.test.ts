import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-contact.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const T0 = Date.parse("2026-11-10T10:00:00Z");
const input = (state: unknown) => ({ params: {}, subscriptionId: "sub-1", state });
const req = (c: { method: string; url: string }) => {
  const u = new URL(c.url);
  return {
    method: c.method,
    url: u.origin + u.pathname,
    query: Object.fromEntries(u.searchParams),
  };
};
const contact = (id: number, updated = "2026-11-10T09:59:00Z") => ({
  id,
  type: "individual",
  updated_at: updated,
});
const reply = (items: unknown[]) => ({ body: { contacts: items } });

test("new-or-updated-contact seeds, emits, retries, and sends the literal since-filtered request", async () => {
  clock.now = () => T0;
  const seed = mockCtx([reply([contact(1)])]);
  const seeded = await trigger.poll!(input({}), seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(req(seed.calls[0]), {
    method: "GET",
    url: "https://crm.redtailtechnology.com/api/public/v1/contacts/search",
    query: { updated_since: "2026-11-10T09:58:00Z" },
  });

  clock.now = () => T0 + 300_000;
  const page = [contact(1, "2026-11-10T10:04:00Z"), contact(1)];
  const run = () => mockCtx([reply(page)]);
  const first = run();
  const out = await trigger.poll!(input(seeded.nextState), first.ctx);
  const retry = await trigger.poll!(input(seeded.nextState), run().ctx);
  assertEquals(out.events, [contact(1, "2026-11-10T10:04:00Z")]);
  assertEquals(retry, out);
  assertEquals(req(first.calls[0]), {
    method: "GET",
    url: "https://crm.redtailtechnology.com/api/public/v1/contacts/search",
    query: { updated_since: "2026-11-10T09:58:00Z" },
  });
});

test("new-or-updated-contact skips an already seen record", async () => {
  clock.now = () => T0;
  const seeded = await trigger.poll!(input({}), mockCtx([reply([contact(1)])]).ctx);
  clock.now = () => T0 + 300_000;
  const out = await trigger.poll!(input(seeded.nextState), mockCtx([reply([contact(1)])]).ctx);
  assertEquals(out.events, []);
});
