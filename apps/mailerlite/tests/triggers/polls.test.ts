import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newGroup from "../../triggers/new-group.ts";
import newSegment from "../../triggers/new-segment.ts";
import newCampaign from "../../triggers/new-campaign.ts";

const input = { params: {}, subscriptionId: "s" };
const R = "https://connect.mailerlite.com/api";
const page = (ids: string[], last = 1) => ({
  body: {
    data: ids.map((id) => ({ id, name: `n${id}` })),
    meta: { current_page: 1, last_page: last },
  },
});
const item = (id: string) => ({ id, name: `n${id}` });

// ---- new-group: newest-first (sort=-created_at), pollFromListAction ------------------------------
test("new-group: seeds without events, then emits only the new group, idempotently", async () => {
  const seeded = await newGroup.poll!({ ...input, state: {} }, mockCtx([page(["1"])]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  const run = () =>
    newGroup.poll!({ ...input, state: seeded.nextState }, mockCtx([page(["2", "1"])]).ctx);
  const first = await run();
  assertEquals(first.events, [item("2")]);
  assertEquals(await run(), first);
});

test("new-group: asks for the groups newest-first with the literal query", async () => {
  const mock = mockCtx([page(["1"])]);
  await newGroup.poll!({ ...input, state: {} }, mock.ctx);
  assertEquals(mock.calls.length, 1);
  assertEquals(mock.calls[0].method, "GET");
  assertEquals(mock.calls[0].url, `${R}/groups?limit=25&page=1&sort=-created_at`);
});

// ---- new-segment / new-campaign: bounded snapshots ------------------------------------------------
const snaps = [
  {
    name: "new-segment",
    trigger: newSegment as typeof newGroup,
    params: {},
    url: (p: number) => `${R}/segments?limit=25&page=${p}`,
    cap: "more than 300 segments",
    pages: 12,
  },
  {
    name: "new-campaign",
    trigger: newCampaign as unknown as typeof newGroup,
    params: { status: "sent" },
    url: (p: number) => `${R}/campaigns?filter%5Bstatus%5D=sent&limit=25&page=${p}`,
    cap: "more than 1000 campaigns",
    pages: 40,
  },
];

for (const { name, trigger, params, url, cap, pages } of snaps) {
  const inp = { ...input, params } as never;
  test(`${name}: seeds, emits only the added record, idempotent, literal first request`, async () => {
    const seed = mockCtx([page(["1"])]);
    const seeded = await trigger.poll!({ ...inp, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, url(1));
    const run = () =>
      trigger.poll!({ ...inp, state: seeded.nextState }, mockCtx([page(["1", "2"])]).ctx);
    const first = await run();
    assertEquals(first.events, [item("2")]);
    assertEquals(await run(), first);
    assertEquals(
      (await trigger.poll!({ ...inp, state: first.nextState }, mockCtx([page(["1", "2"])]).ctx))
        .events,
      [],
    );
  });

  test(`${name}: follows meta.last_page and fails loudly past its cap`, async () => {
    const two = mockCtx([page(["1"], 2), page(["2"], 2)]);
    await trigger.poll!({ ...inp, state: {} }, two.ctx);
    assertEquals(two.calls.map((c) => c.url), [url(1), url(2)]);
    const many = mockCtx(Array.from({ length: pages }, (_, i) => page([`x${i}`], pages + 1)));
    let message = "";
    try {
      await trigger.poll!({ ...inp, state: {} }, many.ctx);
    } catch (e) {
      message = (e as Error).message;
    }
    assertEquals(message.includes(cap), true);
  });
}

test("new-campaign: defaults to draft and passes the chosen status through", async () => {
  const mock = mockCtx([page(["1"])]);
  await newCampaign.poll!({ ...input, state: {} }, mock.ctx);
  assertEquals(mock.calls[0].url, `${R}/campaigns?filter%5Bstatus%5D=draft&limit=25&page=1`);
});
