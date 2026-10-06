import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import stagesList from "../../actions/stages-list.ts";

Deno.test("stages-list: GET /stages, unwraps result and cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: { request_id: "r", result: [{ id: "a" }], nextPageId: "n1" },
  }]);
  const out = await stagesList.execute({ pageSize: 25, pageId: "p0" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/api/v1.0/stages");
  assertEquals(queryOf(calls[0].url).pageSize, "25");
  assertEquals(queryOf(calls[0].url).pageId, "p0");
  assertEquals(out, { result: [{ id: "a" }], nextPageId: "n1" });
});

Deno.test("stages-list: null cursor on the last page; empty filters omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: [] } }]);
  const out = await stagesList.execute({}, ctx) as { nextPageId: string | null };
  assertEquals(out.nextPageId, null);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("stages-list: surfaces a Hyros error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { result: "ERROR", message: ["bad"] } }]);
  await assertRejects(async () => await stagesList.execute({}, ctx), Error, "bad");
});

Deno.test("stages-list: name search", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: [{ name: "SQL", amount: 1 }] } }]);
  await stagesList.execute({ name: "SQL" }, ctx);
  assertEquals(queryOf(calls[0].url).name, "SQL");
});
