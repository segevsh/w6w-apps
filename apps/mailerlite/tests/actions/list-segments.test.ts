import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-segments.ts";

Deno.test("list-segments: GETs /api/segments with page/limit defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], links: {}, meta: {} } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/segments");
  assertEquals(url.searchParams.get("limit"), "25");
  assertEquals(url.searchParams.get("page"), "1");
});

Deno.test("list-segments: forwards an explicit page and limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ limit: 250, page: 2 }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("limit"), "250");
  assertEquals(params.get("page"), "2");
});

Deno.test("list-segments: returns the envelope", async () => {
  const envelope = { data: [{ id: "7", name: "Engaged" }], links: {}, meta: { total: 1 } };
  const { ctx } = mockCtx([{ body: envelope }]);
  assertEquals(await action.execute!({}, ctx), envelope);
});
