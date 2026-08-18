import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-list.ts";

Deno.test("board-list: uses the OFFSET pager, which is what /v2/boards takes", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: "b1" }], total: 2, size: 1 } },
    { status: 200, body: { data: [{ id: "b2" }], total: 2, size: 1 } },
  ], { display: {} });
  const result = await action.execute!({ returnAll: true }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/boards");
  assertEquals(new URL(calls[1].url).searchParams.get("offset"), "1");
  // Never a cursor — that is the item collections' contract.
  assertEquals(new URL(calls[0].url).searchParams.get("cursor"), null);
  assertEquals(result, [{ id: "b1" }, { id: "b2" }]);
});

Deno.test("board-list: passes the search and scope filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], total: 0 } }], { display: {} });
  await action.execute!({ query: "roadmap", teamId: "t1", sort: "last_modified" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("query"), "roadmap");
  assertEquals(q.get("team_id"), "t1");
  assertEquals(q.get("sort"), "last_modified");
});
