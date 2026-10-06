import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import sourcesList from "../../actions/sources-list.ts";

Deno.test("sources-list: GET /sources, unwraps result and cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: { request_id: "r", result: [{ id: "a" }], nextPageId: "n1" },
  }]);
  const out = await sourcesList.execute({ pageSize: 25, pageId: "p0" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/api/v1.0/sources");
  assertEquals(queryOf(calls[0].url).pageSize, "25");
  assertEquals(queryOf(calls[0].url).pageId, "p0");
  assertEquals(out, { result: [{ id: "a" }], nextPageId: "n1" });
});

Deno.test("sources-list: null cursor on the last page; empty filters omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: [] } }]);
  const out = await sourcesList.execute({}, ctx) as { nextPageId: string | null };
  assertEquals(out.nextPageId, null);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("sources-list: surfaces a Hyros error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { result: "ERROR", message: ["bad"] } }]);
  await assertRejects(async () => await sourcesList.execute({}, ctx), Error, "bad");
});

Deno.test("sources-list: booleans, platform and ad source ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: [] } }]);
  await sourcesList.execute({
    includeOrganic: true,
    includeDisregarded: false,
    integrationType: "FACEBOOK",
    adSourceIds: "1,2",
  }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.includeOrganic, "true");
  assertEquals(q.includeDisregarded, "false");
  assertEquals(q.integrationType, "FACEBOOK");
  assertEquals(q.adSourceIds, '"1","2"');
});
