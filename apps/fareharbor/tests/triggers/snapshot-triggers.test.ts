import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newItem from "../../triggers/new-item.ts";
import newOrUpdatedItem from "../../triggers/new-or-updated-item.ts";
import newUser from "../../triggers/new-user.ts";
import newAgent from "../../triggers/new-agent.ts";
import newCompany from "../../triggers/new-company.ts";

const R = "https://fareharbor.com/api/external/v1";

type Case = {
  trigger: typeof newItem;
  params: Record<string, unknown>;
  url: string;
  wrap: (items: unknown[]) => unknown;
  old: unknown;
  fresh: unknown;
  edited: unknown;
};

const cases: Case[] = [
  {
    trigger: newItem,
    params: { shortname: "bodyglove" },
    url: `${R}/companies/bodyglove/items/`,
    wrap: (items) => ({ items }),
    old: { pk: 1, name: "Whales" },
    fresh: { pk: 2, name: "Kayaks" },
    edited: { pk: 1, name: "Whales and dolphins" },
  },
  {
    trigger: newOrUpdatedItem,
    params: { shortname: "bodyglove" },
    url: `${R}/companies/bodyglove/items/`,
    wrap: (items) => ({ items }),
    old: { pk: 1, name: "Whales" },
    fresh: { pk: 2, name: "Kayaks" },
    edited: { pk: 1, name: "Whales and dolphins" },
  },
  {
    trigger: newUser,
    params: { shortname: "bodyglove" },
    url: `${R}/companies/bodyglove/users/`,
    wrap: (items) => ({ users: items }),
    old: { pk: 1, name: "a" },
    fresh: { pk: 2, name: "b" },
    edited: { pk: 1, name: "c" },
  },
  {
    trigger: newAgent,
    params: { shortname: "bodyglove" },
    url: `${R}/companies/bodyglove/agents/`,
    wrap: (items) => ({ agents: items }),
    old: { pk: 1, name: "a" },
    fresh: { pk: 2, name: "b" },
    edited: { pk: 1, name: "c" },
  },
  {
    trigger: newCompany,
    params: {},
    url: `${R}/companies/`,
    wrap: (items) => ({ companies: items }),
    old: { shortname: "bodyglove", name: "Body Glove", currency: "usd" },
    fresh: { shortname: "other", name: "Other", currency: "usd" },
    edited: { shortname: "bodyglove", name: "Body Glove 2", currency: "usd" },
  },
];

for (const c of cases) {
  const key = c.trigger.key;
  const updated = key.startsWith("new-or-updated-");
  const poll = async (state: unknown, items: unknown[]) => {
    const m = mockCtx([{ body: c.wrap(items) }]);
    const r = await c.trigger.poll!({ params: c.params, state } as never, m.ctx);
    return { r, calls: m.calls };
  };

  describe(key, () => {
    test("first check seeds without emitting and sends the literal request", async () => {
      const { r, calls } = await poll({}, [c.old]);
      assertEquals(r.events, []);
      assertEquals((r.nextState as { seeded: boolean }).seeded, true);
      assertEquals(calls.length, 1);
      assertEquals(calls[0].method, "GET");
      assertEquals(calls[0].url, c.url);
    });

    test("a new record is emitted exactly once", async () => {
      const { r: seeded } = await poll({}, [c.old]);
      const { r } = await poll(seeded.nextState, [c.old, c.fresh]);
      assertEquals(r.events, [c.fresh]);
      const { r: again } = await poll(r.nextState, [c.old, c.fresh]);
      assertEquals(again.events, []);
    });

    test("retrying the same state and response gives the same result", async () => {
      const { r: seeded } = await poll({}, [c.old]);
      const one = await poll(seeded.nextState, [c.old, c.fresh]);
      const two = await poll(seeded.nextState, [c.old, c.fresh]);
      assertEquals(one.r, two.r);
    });

    test(
      updated ? "an edited record is emitted again" : "an edited record is not a new one",
      async () => {
        const { r: seeded } = await poll({}, [c.old]);
        const { r } = await poll(seeded.nextState, [c.edited]);
        assertEquals(r.events, updated ? [c.edited] : []);
      },
    );
  });
}

describe("company-scoped triggers", () => {
  for (const t of [newItem, newOrUpdatedItem, newUser, newAgent]) {
    test(`${t.key} refuses to run without a shortname`, async () => {
      const m = mockCtx([]);
      await assertRejects(
        async () => await t.poll!({ params: {}, state: {} } as never, m.ctx),
        Error,
        "shortname",
      );
      assertEquals(m.calls.length, 0);
    });
  }
});
