import { assertEquals } from "@std/assert";
import action from "../../actions/list-broadcasts.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-broadcasts: GETs /v4/broadcasts with no params by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { broadcasts: [], pagination: {} } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/broadcasts");
  assertEquals([...url.searchParams.keys()], []);
});

Deno.test("list-broadcasts: forwards status, sent window, slim and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { broadcasts: [] } }]);
  await action.execute!({
    status: "completed",
    sentAfter: "2026-01-01",
    sentBefore: "2026-02-01",
    slim: true,
    perPage: 5,
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("status"), "completed");
  assertEquals(p.get("sent_after"), "2026-01-01");
  assertEquals(p.get("sent_before"), "2026-02-01");
  assertEquals(p.get("slim"), "true");
  assertEquals(p.get("per_page"), "5");
});

Deno.test("list-broadcasts: returns rows plus the pagination envelope", async () => {
  const body = { broadcasts: [{ id: 9, subject: "Hi" }], pagination: { has_next_page: false } };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({}, ctx), body);
});
