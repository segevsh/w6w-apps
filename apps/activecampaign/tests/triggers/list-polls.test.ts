import assert from "node:assert/strict";
import test from "node:test";
import newAutomation from "../../triggers/new-automation.ts";
import newOrUpdatedAutomation from "../../triggers/new-or-updated-automation.ts";
import newOrUpdatedContact from "../../triggers/new-or-updated-contact.ts";
import newSentCampaign from "../../triggers/new-sent-campaign.ts";
import listContacts from "../../actions/list-contacts.ts";
import listCampaigns from "../../actions/list-campaigns.ts";
import listAutomations from "../../actions/list-automations.ts";
import { mockActiveCampaignCtx } from "../_helpers.ts";

type Poll = (i: unknown, ctx: unknown) => Promise<{ events: unknown[]; nextState: unknown }>;
const API = "https://acme.api-us1.com/api/3";

// Each trigger: the literal query it must send, the response key, and how an edit shows up.
const CASES = [
  {
    t: newOrUpdatedContact,
    list: "contacts",
    path: "/contacts",
    query: [["limit", "20"], ["orders[udate]", "DESC"]],
    mk: (id: string, v = "1") => ({
      id,
      email: `u${id}@example.com`,
      udate: `2026-11-10T10:0${v}:00-06:00`,
    }),
    id: (i: { id: string; udate: string }) => `${i.id}:${i.udate}`,
    edits: true,
  },
  {
    t: newSentCampaign,
    list: "campaigns",
    path: "/campaigns",
    query: [["limit", "20"], ["orders[sdate]", "DESC"]],
    mk: (id: string) => ({ id, name: `C${id}`, sdate: "2026-11-10T10:00:00-06:00" }),
    id: (i: { id: string }) => i.id,
    edits: false,
  },
  {
    t: newAutomation,
    list: "automations",
    path: "/automations",
    query: [["limit", "20"], ["orders[cdate]", "DESC"]],
    mk: (id: string) => ({ id, name: `A${id}`, cdate: "2026-11-10T09:00:00-06:00" }),
    id: (i: { id: string }) => i.id,
    edits: false,
  },
  {
    t: newOrUpdatedAutomation,
    list: "automations",
    path: "/automations",
    query: [["limit", "20"], ["orders[mdate]", "DESC"]],
    mk: (id: string, v = "1") => ({ id, name: `A${id}`, mdate: `2026-11-10T10:0${v}:00-06:00` }),
    id: (i: { id: string; mdate: string }) => `${i.id}:${i.mdate}`,
    edits: true,
  },
] as const;

for (const c of CASES) {
  const input = { params: {}, subscriptionId: "sub-1" };
  const page = (items: unknown[]) => ({
    body: { [c.list]: items, meta: { total: String(items.length) } },
  });
  const run = (state: unknown, items: unknown[]) => {
    const m = mockActiveCampaignCtx([page(items)]);
    return { m, out: (c.t.poll as unknown as Poll)({ ...input, state }, m.ctx) };
  };

  test(`${c.t.key}: seeds with no events, then emits only the new item once, idempotently; sends the literal request`, async () => {
    const seed = run({}, [c.mk("2"), c.mk("1")]);
    const seeded = await seed.out;
    assert.deepEqual(seeded.events, []);
    assert.equal((seeded.nextState as { seeded?: boolean }).seeded, true);
    const u = new URL(seed.m.calls[0].url);
    assert.equal(seed.m.calls[0].method, "GET");
    assert.equal(u.origin + u.pathname, `${API}${c.path}`);
    assert.deepEqual([...u.searchParams.entries()], c.query);

    const newest = [c.mk("3"), c.mk("2"), c.mk("1")];
    const a = await run(seeded.nextState, newest).out;
    const b = await run(seeded.nextState, newest).out;
    assert.deepEqual(a.events, [c.mk("3")]);
    assert.deepEqual(b, a);
  });

  if (c.edits) {
    test(`${c.t.key}: an edited item (new update stamp) is emitted again`, async () => {
      const seeded = await run({}, [c.mk("2", "1"), c.mk("1", "1")]).out;
      const edited = await run(seeded.nextState, [c.mk("1", "5"), c.mk("2", "1")]).out;
      assert.deepEqual(edited.events, [c.mk("1", "5")]);
    });
  }
}

// ---- the additive order params on the three list actions: default-preserving ----

for (
  const [action, key] of [[listContacts, "orders[cdate]"], [listCampaigns, "orders[sdate]"], [
    listAutomations,
    "orders[mdate]",
  ]] as const
) {
  test(`${action.key}: sends no orders[...] unless orderBy is set; ASC is honoured, anything else is DESC`, async () => {
    const field = key.slice(7, -1);
    const plain = mockActiveCampaignCtx([{ body: {} }]);
    await (action.execute as (i: unknown, c: unknown) => Promise<unknown>)({ limit: 5 }, plain.ctx);
    assert.deepEqual(
      [...new URL(plain.calls[0].url).searchParams.keys()].filter((k) => k.startsWith("orders")),
      [],
    );
    const asc = mockActiveCampaignCtx([{ body: {} }]);
    await (action.execute as (i: unknown, c: unknown) => Promise<unknown>)({
      orderBy: field,
      orderDirection: "ASC",
    }, asc.ctx);
    assert.equal(new URL(asc.calls[0].url).searchParams.get(key), "ASC");
    const dflt = mockActiveCampaignCtx([{ body: {} }]);
    await (action.execute as (i: unknown, c: unknown) => Promise<unknown>)(
      { orderBy: field },
      dflt.ctx,
    );
    assert.equal(new URL(dflt.calls[0].url).searchParams.get(key), "DESC");
  });
}
