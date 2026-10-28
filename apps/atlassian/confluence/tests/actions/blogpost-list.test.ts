import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/blogpost-list.ts";

const display = { site: "acme" };

Deno.test("blogpost-list: filters by space and status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [{ id: "b1" }], _links: {} } }], {
    display,
  });
  const result = await action.execute!({ spaceId: "101", status: ["current"] }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/wiki/api/v2/blogposts");
  assertEquals(q.getAll("space-id"), ["101"]);
  assertEquals(q.getAll("status"), ["current"]);
  assertEquals(result, [{ id: "b1" }]);
});
