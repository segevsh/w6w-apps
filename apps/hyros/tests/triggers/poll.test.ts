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
    const seedCtx = mockCtx([page([{ id: "a", creationDate: "x" }])]);
    const seeded = await trig.poll!({ ...input, state: {} }, seedCtx.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seedCtx.calls[0].method, "GET");
    assertEquals(pathOf(seedCtx.calls[0].url), path);
    assertEquals(queryOf(seedCtx.calls[0].url), {
      fromDate: "2026-11-09T09:58:00Z",
      pageSize: "250",
    });

    clock.now = () => T1;
    const run = () =>
      trig.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([page([{ id: "a" }, { id: "b" }])]).ctx,
      );
    const first = await run();
    const retry = await run();
    assertEquals(first.events, [{ id: "b" }]);
    assertEquals(retry, first);
    assertEquals((first.nextState as { cursor: number }).cursor, T1);
  });
}

test("new-lead follows nextPageId and sends the opaque cursor back", async () => {
  clock.now = () => T0;
  const { ctx, calls } = mockCtx([page([{ id: "a" }], "cur1"), page([{ id: "b" }])]);
  const seeded = await newLead.poll!({ ...input, state: {} }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(queryOf(calls[1].url).pageId, "cur1");
  assertEquals((seeded.nextState as { ids: string[] }).ids.toSorted(), ["a", "b"]);
});

test("new-sale holds the cursor when the page ceiling is hit", async () => {
  clock.now = () => T0;
  const seeded = await newSale.poll!({ ...input, state: {} }, mockCtx([page([{ id: "a" }])]).ctx);
  clock.now = () => T1;
  const pages = Array.from({ length: 5 }, (_, i) => page([{ id: `s${i}` }], `c${i}`));
  const out = await newSale.poll!({ ...input, state: seeded.nextState }, mockCtx(pages).ctx);
  assertEquals((out.nextState as { cursor: number }).cursor, T0);
});
