import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-docs.ts";

test("list-docs: GETs /docs with filters in the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "doc-1" }] } }]);
  const out = await action.execute({
    workspaceId: "ws-1",
    query: "budget",
    isOwner: true,
    limit: 10,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/apis/v1/docs");
  assertEquals(url.searchParams.get("workspaceId"), "ws-1");
  assertEquals(url.searchParams.get("query"), "budget");
  assertEquals(url.searchParams.get("isOwner"), "true");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(out.items[0].id, "doc-1");
});

test("list-docs: defaults limit to 25 when omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "25");
});
