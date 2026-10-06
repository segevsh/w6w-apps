import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import adsList from "../../actions/ads-list.ts";

Deno.test("ads-list: GET /ads, unwraps result and cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: { request_id: "r", result: [{ id: "a" }], nextPageId: "n1" },
  }]);
  const out = await adsList.execute({ pageSize: 25, pageId: "p0" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/api/v1.0/ads");
  assertEquals(queryOf(calls[0].url).pageSize, "25");
  assertEquals(queryOf(calls[0].url).pageId, "p0");
  assertEquals(out, { result: [{ id: "a" }], nextPageId: "n1" });
});

Deno.test("ads-list: null cursor on the last page; empty filters omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: [] } }]);
  const out = await adsList.execute({}, ctx) as { nextPageId: string | null };
  assertEquals(out.nextPageId, null);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("ads-list: surfaces a Hyros error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { result: "ERROR", message: ["bad"] } }]);
  await assertRejects(async () => await adsList.execute({}, ctx), Error, "bad");
});

Deno.test("ads-list: platform filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: [] } }]);
  await adsList.execute({ integrationType: "GOOGLE", adSourceIds: "9" }, ctx);
  assertEquals(queryOf(calls[0].url).integrationType, "GOOGLE");
  assertEquals(queryOf(calls[0].url).adSourceIds, '"9"');
});
