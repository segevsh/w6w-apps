import { assertEquals } from "@std/assert";
import action from "../../actions/list-sessions.ts";
import { API_ROOT, mockCtx, page, queryAllOf, queryOf, urlOf } from "../_helpers.ts";

const sample = page([{ id: "sess-1" }], { count: 1 });

Deno.test("list-sessions: reads /consultant/sessions", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/consultant/sessions`);
  assertEquals(result, sample);
});

Deno.test("list-sessions: id lists go out as repeated keys", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  await action.execute({
    consultants: ["c-1", "c-2"],
    records: ["rec-1"],
    services: ["svc-1", "svc-2"],
  }, ctx);
  const all = queryAllOf(calls[0].url);
  assertEquals(all.consultants, ["c-1", "c-2"]);
  assertEquals(all.records, ["rec-1"]);
  assertEquals(all.services, ["svc-1", "svc-2"]);
});

Deno.test("list-sessions: the group flag and the date window are passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  await action.execute({
    group: true,
    date_eq: "2026-09-22T09:00:00Z",
    date_gte: "2026-09-01T00:00:00Z",
    date_lte: "2026-09-30T23:59:59Z",
  }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.group, "true");
  assertEquals(query.date_eq, "2026-09-22T09:00:00Z");
  assertEquals(query.date_gte, "2026-09-01T00:00:00Z");
  assertEquals(query.date_lte, "2026-09-30T23:59:59Z");
});

Deno.test("list-sessions: pagination controls are the shared four", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  await action.execute({ after_id: "sess-1", before_id: "sess-9", limit: 50, skip: 5 }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.after_id, "sess-1");
  assertEquals(query.before_id, "sess-9");
  assertEquals(query.limit, "50");
  assertEquals(query.skip, "5");
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), [
    "count",
    "hasMore",
    "items",
  ]);
});
