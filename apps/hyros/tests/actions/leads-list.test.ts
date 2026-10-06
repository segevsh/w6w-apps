import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import leadsList from "../../actions/leads-list.ts";

Deno.test("leads-list: GET /leads, unwraps result and cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: { request_id: "r", result: [{ id: "a" }], nextPageId: "n1" },
  }]);
  const out = await leadsList.execute({ pageSize: 25, pageId: "p0" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/api/v1.0/leads");
  assertEquals(queryOf(calls[0].url).pageSize, "25");
  assertEquals(queryOf(calls[0].url).pageId, "p0");
  assertEquals(out, { result: [{ id: "a" }], nextPageId: "n1" });
});

Deno.test("leads-list: null cursor on the last page; empty filters omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: [] } }]);
  const out = await leadsList.execute({}, ctx) as { nextPageId: string | null };
  assertEquals(out.nextPageId, null);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("leads-list: surfaces a Hyros error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { result: "ERROR", message: ["bad"] } }]);
  await assertRejects(async () => await leadsList.execute({}, ctx), Error, "bad");
});

Deno.test("leads-list: filters are sent as quoted comma lists", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: [] } }]);
  await leadsList.execute({ emails: "a@x.io, b@x.io", ids: "i1", fromDate: "2026-01-01" }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.emails, '"a@x.io","b@x.io"');
  assertEquals(q.ids, '"i1"');
  assertEquals(q.fromDate, "2026-01-01");
});
