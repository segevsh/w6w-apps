import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import funnelList from "../../actions/funnel-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("funnel-list: metadata", () => {
  assertEquals(funnelList.key, "funnel-list");
  assertEquals(funnelList.type, "read");
  assertEquals(funnelList.params?.length, 0);
});

test("funnel-list: GET /funnels, no query params, wraps the bare array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "f1", name: "Marketing" }] }]);
  const result = await funnelList.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/funnels");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(result, { funnels: [{ id: "f1", name: "Marketing" }] });
});

test("funnel-list: empty account -> empty array, not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [] }]);
  const result = await funnelList.execute({}, ctx);
  assertEquals(result, { funnels: [] });
});
