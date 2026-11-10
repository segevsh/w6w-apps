import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newCustomer from "../../triggers/new-customer.ts";
import newOrUpdatedCustomer from "../../triggers/new-or-updated-customer.ts";
import newAddress from "../../triggers/new-address.ts";
import newOrUpdatedAddress from "../../triggers/new-or-updated-address.ts";
import newSubscription from "../../triggers/new-subscription.ts";
import newOrUpdatedSubscription from "../../triggers/new-or-updated-subscription.ts";
import newOnetime from "../../triggers/new-onetime.ts";
import newDiscount from "../../triggers/new-discount.ts";
import newCharge from "../../triggers/new-charge.ts";
import newOrUpdatedCharge from "../../triggers/new-or-updated-charge.ts";

type Trigger = typeof newCustomer;
type Ctx = Parameters<NonNullable<Trigger["poll"]>>[1];

interface Case {
  trigger: Trigger;
  path: string; // literal request path
  envelope: string; // response array key
  stamp: "created_at" | "updated_at";
  filter: "created_at_min" | "updated_at_min";
}

const CASES: Case[] = [
  {
    trigger: newCustomer,
    path: "/customers",
    envelope: "customers",
    stamp: "created_at",
    filter: "created_at_min",
  },
  {
    trigger: newOrUpdatedCustomer,
    path: "/customers",
    envelope: "customers",
    stamp: "updated_at",
    filter: "updated_at_min",
  },
  {
    trigger: newAddress,
    path: "/addresses",
    envelope: "addresses",
    stamp: "created_at",
    filter: "created_at_min",
  },
  {
    trigger: newOrUpdatedAddress,
    path: "/addresses",
    envelope: "addresses",
    stamp: "updated_at",
    filter: "updated_at_min",
  },
  {
    trigger: newSubscription,
    path: "/subscriptions",
    envelope: "subscriptions",
    stamp: "created_at",
    filter: "created_at_min",
  },
  {
    trigger: newOrUpdatedSubscription,
    path: "/subscriptions",
    envelope: "subscriptions",
    stamp: "updated_at",
    filter: "updated_at_min",
  },
  {
    trigger: newOnetime,
    path: "/onetimes",
    envelope: "onetimes",
    stamp: "created_at",
    filter: "created_at_min",
  },
  {
    trigger: newDiscount,
    path: "/discounts",
    envelope: "discounts",
    stamp: "created_at",
    filter: "created_at_min",
  },
  {
    trigger: newCharge,
    path: "/charges",
    envelope: "charges",
    stamp: "created_at",
    filter: "created_at_min",
  },
  {
    trigger: newOrUpdatedCharge,
    path: "/charges",
    envelope: "charges",
    stamp: "updated_at",
    filter: "updated_at_min",
  },
];

const NOW = 1_700_000_000_000;
const T0 = Date.parse("2026-11-09T12:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();
const input = { params: {} };

async function at<T>(ms: number, run: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => ms;
  try {
    return await run();
  } finally {
    Date.now = real;
  }
}

/** Stateful fake: ascending id, `<filter>=` window on the stamp, 100-row pages, opaque `off|min` cursor. */
function fakeVendor(c: Case, db: Array<Record<string, unknown>>): Ctx {
  return {
    log() {},
    fetch: (u: string | URL | Request) => {
      const q = new URL(String(u)).searchParams;
      const [off, min] = q.get("cursor")
        ? q.get("cursor")!.split("|")
        : ["0", q.get(c.filter) ?? ""];
      const rows = db.filter((r) => !min || Date.parse(String(r[c.stamp])) > Date.parse(min));
      const start = Number(off);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            [c.envelope]: rows.slice(start, start + 100),
            next_cursor: start + 100 < rows.length ? `${start + 100}|${min}` : null,
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );
    },
  } as unknown as Ctx;
}
const row = (id: number, ms: number) => ({ id, created_at: iso(ms), updated_at: iso(ms) });

for (const c of CASES) {
  const name = c.trigger.key;
  const body = (items: unknown[]) => ({ [c.envelope]: items });

  test(`${name}: seeds, emits a new record, retries idempotently, requests the literal window`, async () => {
    const seed = mockCtx([]);
    const seeded = await at(NOW, () => c.trigger.poll!({ ...input, state: {} }, seed.ctx));
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 0);

    const rec = { id: 7, created_at: iso(NOW + 5_000), updated_at: iso(NOW + 5_000) };
    const run = mockCtx([{ body: body([rec]) }]);
    const first = await at(
      NOW + 300_000,
      () => c.trigger.poll!({ ...input, state: seeded.nextState }, run.ctx),
    );
    const retry = await at(
      NOW + 300_000,
      () =>
        c.trigger.poll!(
          { ...input, state: seeded.nextState },
          mockCtx([{ body: body([rec]) }]).ctx,
        ),
    );
    assertEquals(first.events, [rec]);
    assertEquals(retry, first);
    assertEquals(run.calls.length, 1);
    assertEquals(run.calls[0].method, "GET");
    // window start = last check (the seed, NOW) - 120 s
    assertEquals(
      run.calls[0].url,
      `https://api.rechargeapps.com${c.path}?limit=100&${c.filter}=2023-11-14T22%3A11%3A20.000Z`,
    );
    const again = await at(
      NOW + 600_000,
      () =>
        c.trigger.poll!({ ...input, state: first.nextState }, mockCtx([{ body: body([rec]) }]).ctx),
    );
    assertEquals(again.events, []);
  });

  test(`${name}: a window of MAX_PAGES + 1 full pages is drained across checks, each once`, async () => {
    const db = Array.from({ length: 600 }, (_, i) => row(i + 1, T0 + 1000 + i));
    const v = fakeVendor(c, db);
    let state: unknown = (await at(T0, () =>
      c.trigger.poll!({ ...input, state: {} }, v))).nextState;
    const emitted: string[] = [];
    const cursors: number[] = [];
    let t = T0 + 300_000;
    for (let check = 0; check < 4; check++, t += 300_000) {
      const r = await at(t, () => c.trigger.poll!({ ...input, state }, v));
      for (const e of r.events as Array<{ id: unknown }>) emitted.push(String(e.id));
      state = r.nextState;
      cursors.push((state as { cursor: number }).cursor);
    }
    assertEquals(emitted.length, 600);
    assertEquals(new Set(emitted).size, 600);
    assertEquals(cursors[0], T0); // held while the 6-page window was drained
    assertEquals(cursors[1] > T0, true); // moved after the drain
  });

  test(`${name}: records from before the seed never flood a later check; a later one is emitted`, async () => {
    const db = Array.from({ length: 700 }, (_, i) => row(i + 1, T0 - 60_000 + i));
    const v = fakeVendor(c, db);
    const seeded = await at(T0, () => c.trigger.poll!({ ...input, state: {} }, v));
    assertEquals(seeded.events, []);
    let state = seeded.nextState;
    for (let check = 1; check <= 3; check++) {
      const r = await at(T0 + check * 300_000, () => c.trigger.poll!({ ...input, state }, v));
      assertEquals(r.events, []);
      state = r.nextState;
    }
    db.push(row(9001, T0 + 1_000_000));
    const r = await at(T0 + 1_200_000, () => c.trigger.poll!({ ...input, state }, v));
    assertEquals((r.events as Array<{ id: number }>).map((e) => e.id), [9001]);
  });
}

for (const c of CASES.filter((x) => x.stamp === "updated_at")) {
  test(`${c.trigger.key}: an edited record is a new event`, async () => {
    const seeded = await at(T0, () => c.trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx));
    const rec = (u: number) => ({ id: 3, created_at: iso(T0 - 1000), updated_at: iso(u) });
    const a = await at(T0 + 300_000, () =>
      c.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body: { [c.envelope]: [rec(T0 + 1000)] } }]).ctx,
      ));
    assertEquals(a.events.length, 1);
    const b = await at(T0 + 600_000, () =>
      c.trigger.poll!(
        { ...input, state: a.nextState },
        mockCtx([{ body: { [c.envelope]: [rec(T0 + 1000)] } }]).ctx,
      ));
    assertEquals(b.events, []);
    const edited = await at(T0 + 900_000, () =>
      c.trigger.poll!(
        { ...input, state: b.nextState },
        mockCtx([{ body: { [c.envelope]: [rec(T0 + 700_000)] } }]).ctx,
      ));
    assertEquals(edited.events.length, 1);
  });
}
