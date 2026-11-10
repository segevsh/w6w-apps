import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import newLead from "../../triggers/new-lead.ts";
import newSale from "../../triggers/new-sale.ts";

const T0 = Date.parse("2026-11-09T10:00:00Z");
const T1 = Date.parse("2026-11-09T10:05:00Z");
const input = { params: {}, subscriptionId: "sub-1" };
const page = (result: unknown[], nextPageId?: string) => ({
  body: { request_id: "r", result, ...(nextPageId ? { nextPageId } : {}) },
});

for (
  const [trig, path] of [[newLead, "/v1/api/v1.0/leads"], [newSale, "/v1/api/v1.0/sales"]] as const
) {
  test(`${trig.key}: seeds, emits the new record, retries idempotently, requests the literal fromDate window`, async () => {
    clock.now = () => T0;
    const seeded = await trig.poll!({ ...input, state: {} }, mockCtx([]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

    clock.now = () => T1;
    const a = { id: "a", creationDate: "2026-11-09T09:59:00Z" };
    const b = { id: "b", creationDate: "2026-11-09T10:02:00Z" };
    const checkCtx = mockCtx([page([a, b])]);
    const run = () =>
      trig.poll!({ ...input, state: seeded.nextState }, mockCtx([page([a, b])]).ctx);
    const first = await trig.poll!({ ...input, state: seeded.nextState }, checkCtx.ctx);
    const retry = await run();
    assertEquals(checkCtx.calls[0].method, "GET");
    assertEquals(pathOf(checkCtx.calls[0].url), path);
    assertEquals(queryOf(checkCtx.calls[0].url), {
      fromDate: "2026-11-09T09:58:00Z",
      pageSize: "250",
    });
    assertEquals(first.events, [b]);
    assertEquals(retry, first);
    assertEquals((first.nextState as { cursor: number }).cursor, T1);
  });
}

test("new-lead follows nextPageId and sends the opaque cursor back", async () => {
  clock.now = () => T0;
  const seeded = await newLead.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  clock.now = () => T1;
  const a = { id: "a", creationDate: "2026-11-09T10:01:00Z" };
  const b = { id: "b", creationDate: "2026-11-09T10:02:00Z" };
  const { ctx, calls } = mockCtx([page([a], "cur1"), page([b])]);
  const out = await newLead.poll!({ ...input, state: seeded.nextState }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(queryOf(calls[1].url).pageId, "cur1");
  assertEquals(out.events.length, 2);
});

test("new-sale holds the cursor and a resume position when the page ceiling is hit", async () => {
  clock.now = () => T0;
  const seeded = await newSale.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  clock.now = () => T1;
  const pages = Array.from({ length: 5 }, (_, i) => page([{ id: `s${i}` }], `c${i}`));
  const out = await newSale.poll!({ ...input, state: seeded.nextState }, mockCtx(pages).ctx);
  assertEquals((out.nextState as { cursor: number }).cursor, T0);
  assertEquals((out.nextState as { resume: { pos: string } }).resume.pos, "c4");
});
