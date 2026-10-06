import { assert, assertEquals } from "@std/assert";
import groupMemberList from "../../actions/group-member-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("group-member-list: sends GET /groups/${seg(input.groupId)}/members and reads pagination from headers", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ "id": 7, "email": "m@a.co" }],
    headers: {
      "content-type": "application/json",
      "total-count": "41",
      link:
        '<https://uscreen.io/publisher_api/v1/x?page=3>; rel="next", <https://uscreen.io/publisher_api/v1/x?page=5>; rel="last"',
    },
  }]);
  const out = await groupMemberList.execute({ "groupId": 2 } as never, ctx) as unknown as {
    items: unknown[];
    totalCount: number | null;
    nextPage: number | null;
    hasMore: boolean;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/groups/2/members");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.items, [{ "id": 7, "email": "m@a.co" }]);
  assertEquals(out.totalCount, 41);
  assertEquals(out.nextPage, 3);
  assertEquals(out.hasMore, true);
});

Deno.test("group-member-list: last page has no next link", async () => {
  const { ctx } = mockCtx([{
    body: [],
    headers: { "content-type": "application/json", "total-count": "0" },
  }]);
  const out = await groupMemberList.execute({ "groupId": 2 } as never, ctx) as unknown as {
    hasMore: boolean;
    nextPage: number | null;
  };
  assert(!out.hasMore);
  assertEquals(out.nextPage, null);
});
