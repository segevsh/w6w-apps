import { afterEach, describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNationBuilderCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import newDonation from "../../triggers/new-donation.ts";
import newOrUpdatedDonation from "../../triggers/new-or-updated-donation.ts";
import newEvent from "../../triggers/new-event.ts";
import newList from "../../triggers/new-list.ts";
import newTag from "../../triggers/new-tag.ts";
import newCustomField from "../../triggers/new-custom-field.ts";
import newPersonOnList from "../../triggers/new-person-on-list.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});
const at = (iso: string) => {
  clock.now = () => Date.parse(iso);
};
const input = (params: Record<string, unknown>, state: unknown) =>
  ({ params, state, subscriptionId: "sub-1" }) as never;
const ctx = (bodies: unknown[]) =>
  mockNationBuilderCtx(bodies.map((data) => ({ body: { data, meta: {} } })));
const base = "https://acme.nationbuilder.com/api/v2";

// ---- snapshot triggers -------------------------------------------------------------------------
describe("snapshot triggers", () => {
  const cases = [
    {
      trigger: newEvent,
      params: {},
      url: `${base}/events?page%5Bsize%5D=100&page%5Bnumber%5D=1`,
      type: "events",
    },
    {
      trigger: newList,
      params: {},
      url: `${base}/lists?page%5Bsize%5D=100&page%5Bnumber%5D=1`,
      type: "lists",
    },
    {
      trigger: newTag,
      params: {},
      url: `${base}/signup_tags?page%5Bsize%5D=100&page%5Bnumber%5D=1`,
      type: "signup_tags",
    },
    {
      trigger: newCustomField,
      params: {},
      url: `${base}/custom_fields?page%5Bsize%5D=100&page%5Bnumber%5D=1`,
      type: "custom_fields",
    },
    {
      trigger: newPersonOnList,
      params: { listId: "21" },
      url: `${base}/lists/21/signups?page%5Bsize%5D=100&page%5Bnumber%5D=1`,
      type: "signups",
    },
  ];
  for (const c of cases) {
    const row = (id: string) => ({ id, type: c.type, attributes: { name: `n-${id}` } });
    test(`${c.trigger.key}: seeds, requests the literal list, emits only the added row, retries`, async () => {
      const seed = ctx([[row("1")]]);
      const seeded = await c.trigger.poll!(input(c.params, {}), seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(seed.calls[0].url, c.url);
      const a = await c.trigger.poll!(
        input(c.params, seeded.nextState),
        ctx([[row("1"), row("2")]]).ctx,
      );
      const b = await c.trigger.poll!(
        input(c.params, seeded.nextState),
        ctx([[row("1"), row("2")]]).ctx,
      );
      assertEquals(a.events, [{ id: "2", type: c.type, name: "n-2" }]);
      assertEquals(b, a);
    });
  }
  test("a listing that fills the row cap throws instead of guessing", async () => {
    const page = Array.from({ length: 100 }, (_, i) => ({ id: String(i), type: "tags" }));
    let message = "";
    try {
      await newTag.poll!(input({}, {}), ctx(Array.from({ length: 50 }, () => page)).ctx);
    } catch (e) {
      message = (e as Error).message;
    }
    assertEquals(message.includes("5000 rows"), true);
  });
  test("a second page is read when the first is full", async () => {
    const full = Array.from({ length: 100 }, (_, i) => ({ id: String(i), type: "tags" }));
    const m = ctx([full, [{ id: "100", type: "tags" }]]);
    const out = await newTag.poll!(input({}, {}), m.ctx);
    assertEquals(out.events, []);
    assertEquals(m.calls.length, 2);
    assertEquals(m.calls[1].url, `${base}/signup_tags?page%5Bsize%5D=100&page%5Bnumber%5D=2`);
  });
  test("new-person-on-list requires a list id", async () => {
    let message = "";
    try {
      await newPersonOnList.poll!(input({}, {}), ctx([[]]).ctx);
    } catch (e) {
      message = (e as Error).message;
    }
    assertEquals(message.includes("listId is required"), true);
  });
});

// ---- donations: since-filter -----------------------------------------------------------------
const START = Date.parse("2026-11-10T11:00:00Z");
const seeded = { v: 1, kind: "ids", seeded: true, ids: [], cursor: START, floor: START };
const don = (id: string, created: string, updated = created) => ({
  id,
  type: "donations",
  attributes: { amount_in_cents: 500, created_at: created, updated_at: updated },
});
const fullPage = (n: number, created: string) =>
  Array.from({ length: 100 }, (_, i) => don(`${created}-${n}-${i}`, created));

describe("new-donation (since-filter)", () => {
  test("seeds without reading, then requests the literal created_at window", async () => {
    at("2026-11-10T11:00:00Z");
    const seed = ctx([]);
    const first = await newDonation.poll!(input({}, {}), seed.ctx);
    assertEquals(first.events, []);
    assertEquals(seed.calls.length, 0);
    at("2026-11-10T11:05:00Z");
    const m = ctx([[don("5", "2026-11-10T11:03:00Z")]]);
    const out = await newDonation.poll!(input({}, first.nextState), m.ctx);
    assertEquals(
      m.calls[0].url,
      `${base}/donations?page%5Bsize%5D=100&page%5Bnumber%5D=1&filter%5Bcreated_at%5D%5Bgte%5D=2026-11-10T10%3A58%3A00.000Z`,
    );
    assertEquals(out.events.map((e) => (e as { id: string }).id), ["5"]);
    const retry = await newDonation.poll!(
      input({}, first.nextState),
      ctx([[don("5", "2026-11-10T11:03:00Z")]]).ctx,
    );
    assertEquals(retry, out);
  });
  test("a window of maxPages + 1 full pages drains across checks, none twice (9.8)", async () => {
    at("2026-11-10T11:05:00Z");
    const pages = [1, 2, 3, 4, 5].map((n) => fullPage(n, "2026-11-10T11:02:00Z"));
    const a = await newDonation.poll!(input({}, seeded), ctx(pages).ctx);
    assertEquals(a.events.length, 500);
    const resume = (a.nextState as { resume?: { pos?: number } }).resume;
    assertEquals(resume?.pos, 6);
    const m = ctx([fullPage(6, "2026-11-10T11:02:00Z").slice(0, 7)]);
    const b = await newDonation.poll!(input({}, a.nextState), m.ctx);
    assertEquals(b.events.length, 7);
    assertEquals(
      m.calls[0].url.includes("page%5Bnumber%5D=6") &&
        m.calls[0].url.includes("created_at%5D%5Blt%5D="),
      true,
    );
    assertEquals((b.nextState as { resume?: unknown }).resume, undefined);
    assertEquals((b.nextState as { cursor?: number }).cursor, Date.parse("2026-11-10T11:05:00Z"));
    const ids = [...a.events, ...b.events].map((e) => (e as { id: string }).id);
    assertEquals(new Set(ids).size, ids.length);
  });
  test("records created before the seed never emit later (9.9)", async () => {
    at("2026-11-10T11:05:00Z");
    const old = [1, 2, 3, 4, 5].map((n) => fullPage(n, "2026-11-10T10:00:00Z"));
    const none = await newDonation.poll!(input({}, seeded), ctx(old).ctx);
    assertEquals(none.events, []);
    at("2026-11-10T11:10:00Z");
    const one = await newDonation.poll!(
      input({}, { ...seeded, cursor: Date.parse("2026-11-10T11:05:00Z") }),
      ctx([[
        don("new", "2026-11-10T11:07:00Z"),
        ...fullPage(9, "2026-11-10T10:00:00Z").slice(0, 3),
      ]]).ctx,
    );
    assertEquals(one.events.map((e) => (e as { id: string }).id), ["new"]);
  });
});

describe("new-or-updated-donation (since-filter)", () => {
  test("an old donation edited after the seed is an event; request filters updated_at", async () => {
    at("2026-11-10T11:05:00Z");
    const m = ctx([[
      don("7", "2026-11-01T09:00:00Z", "2026-11-10T11:03:00Z"),
      don("8", "2026-11-01T09:00:00Z", "2026-11-10T10:00:00Z"),
    ]]);
    const out = await newOrUpdatedDonation.poll!(input({}, seeded), m.ctx);
    assertEquals(
      m.calls[0].url,
      `${base}/donations?page%5Bsize%5D=100&page%5Bnumber%5D=1&filter%5Bupdated_at%5D%5Bgte%5D=2026-11-10T10%3A58%3A00.000Z`,
    );
    assertEquals(out.events.map((e) => (e as { id: string }).id), ["7"]);
    const again = await newOrUpdatedDonation.poll!(
      input({}, out.nextState),
      ctx([[don("7", "2026-11-01T09:00:00Z", "2026-11-10T11:04:30Z")]]).ctx,
    );
    assertEquals(again.events.map((e) => (e as { id: string }).id), ["7"]);
  });
});
