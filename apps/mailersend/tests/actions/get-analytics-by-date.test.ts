import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-analytics-by-date.ts";
import { exec, mockCtx, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("get-analytics-by-date: GETs /v1/analytics/date with integer Unix bounds", async () => {
  const resp = { data: { stats: [{ date: "2026-10-01", sent: 3 }] } };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const out = await exec(action, {
    dateFrom: "2026-10-01 00:00:00",
    dateTo: 1790000000,
    domainId: "d1",
    groupBy: "weeks",
    event: ["sent", "delivered"],
    tags: "a,b",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/analytics/date");
  const q = queryOf(calls[0].url);
  assertEquals(q.date_from, String(Date.UTC(2026, 9, 1) / 1000));
  assertEquals(q.date_to, "1790000000");
  assertEquals([q.domain_id, q.group_by], ["d1", "weeks"]);
  assertEquals(queryAll(calls[0].url, "event[]"), ["sent", "delivered"]);
  assertEquals(queryAll(calls[0].url, "tags[]"), ["a", "b"]);
  assertEquals(out, resp);
});

Deno.test("get-analytics-by-date: reads a zoned ISO date and a numeric string", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await exec(action, { dateFrom: "2026-10-01T02:00:00+02:00", dateTo: "1443651141" }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.date_from, String(Date.UTC(2026, 9, 1) / 1000));
  assertEquals(q.date_to, "1443651141");
});

Deno.test("get-analytics-by-date: an unreadable date is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve().then(() => exec(action, { dateFrom: "soon", dateTo: 5 }, ctx)),
    Error,
    "cannot read",
  );
  assertEquals(calls.length, 0);
});
