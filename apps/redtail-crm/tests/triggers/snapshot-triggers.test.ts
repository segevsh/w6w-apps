import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newOpportunity from "../../triggers/new-opportunity.ts";
import newContactNote from "../../triggers/new-contact-note.ts";
import newContactAddress from "../../triggers/new-contact-address.ts";

const BASE = "https://crm.redtailtechnology.com/api/public/v1";
// `url` is the LITERAL first-page request; `key` the response array each list answers with.
const feeds = [
  {
    name: "new-opportunity",
    trigger: newOpportunity,
    params: {},
    key: "opportunities",
    url: `${BASE}/opportunities?page=1`,
  },
  {
    name: "new-contact-note",
    trigger: newContactNote,
    params: { contactId: 7 },
    key: "notes",
    url: `${BASE}/contacts/7/notes?page=1`,
  },
  {
    name: "new-contact-address",
    trigger: newContactAddress,
    params: { contactId: 7 },
    key: "addresses",
    url: `${BASE}/contacts/7/addresses?page=1`,
  },
];

type Feed = (typeof feeds)[number];
const reply = (f: Feed, ids: number[], totalPages = 1) => ({
  body: {
    [f.key]: ids.map((id) => ({ id })),
    meta: { total_records: ids.length, total_pages: totalPages },
  },
});
const run = async (f: Feed, state: unknown, replies: ReturnType<typeof reply>[]) => {
  const m = mockCtx(replies);
  const r = await f.trigger.poll!({ params: f.params, state, subscriptionId: "s" }, m.ctx);
  return { r, calls: m.calls };
};

for (const f of feeds) {
  test(`${f.name}: seeds, emits only the added record, retries identically, literal request`, async () => {
    const seed = await run(f, {}, [reply(f, [1, 2])]);
    assertEquals(seed.r.events, []);
    assertEquals((seed.r.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, f.url);

    const first = await run(f, seed.r.nextState, [reply(f, [3, 2, 1])]);
    const retry = await run(f, seed.r.nextState, [reply(f, [3, 2, 1])]);
    assertEquals(first.r.events, [{ id: 3 }]);
    assertEquals(retry.r, first.r);
    assertEquals(first.calls[0].url, f.url);
    assertEquals((await run(f, first.r.nextState, [reply(f, [3, 2, 1])])).r.events, []);
  });
}

test("new-opportunity finds a record on a later page, whatever the list order", async () => {
  const f = feeds[0];
  const seed = await run(f, {}, [reply(f, [1, 2], 2), reply(f, [3], 2)]);
  assertEquals(seed.calls.map((c) => c.url), [
    `${BASE}/opportunities?page=1`,
    `${BASE}/opportunities?page=2`,
  ]);
  const out = await run(f, seed.r.nextState, [reply(f, [1, 2], 2), reply(f, [3, 4], 2)]);
  assertEquals(out.r.events, [{ id: 4 }]);
});

test("new-contact-note throws, naming the cap, when the list is longer than its page cap", async () => {
  const f = feeds[1];
  let message = "";
  await run(f, {}, Array.from({ length: 20 }, () => reply(f, [1], 21))).catch((
    e: Error,
  ) => (message = e.message));
  assertEquals(message.includes("at most 20"), true);
});
