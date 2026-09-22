import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/member-list.ts";

Deno.test("member-list: filters by office ids and pages", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { get_metadata: { total: 1 }, members: [{ id: 11, memberUserId: 100234 }] },
  }]);
  const result = await action.execute!({ groupIds: "12345,678", limit: 20 }, ctx) as {
    members: Array<{ memberUserId: number }>;
  };

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/members");
  assertEquals(url.searchParams.get("groupIds"), "12345,678");
  assertEquals(url.searchParams.get("limit"), "20");
  assertEquals(result.members[0].memberUserId, 100234);
});

Deno.test("member-list: sends no query at all when nothing is set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { members: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
