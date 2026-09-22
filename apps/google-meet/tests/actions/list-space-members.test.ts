import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-space-members.ts";

Deno.test("list-space-members: GETs the members of a space", async () => {
  const { ctx, calls } = mockCtx([{ body: { members: [{ name: "x" }], nextPageToken: "t" } }]);
  const result = await action.execute!({ parent: "spaces/abc" }, ctx) as Record<string, unknown>;
  assertEquals(result.nextPageToken, "t");
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v2/spaces/abc/members");
});

Deno.test("list-space-members: forwards pageSize and pageToken", async () => {
  const { ctx, calls } = mockCtx([{ body: { members: [] } }]);
  await action.execute!({ parent: "spaces/abc", pageSize: 25, pageToken: "tok" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("pageSize"), "25");
  assertEquals(params.get("pageToken"), "tok");
});
