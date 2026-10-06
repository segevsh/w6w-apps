import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("user-list: GET /api/v3/portal/1/users", async () => {
  const { ctx, calls } = mockProjectsCtx([{
    body: {
      "page_info": { "page": 2, "per_page": 50, "has_next_page": true },
      "users": [{ "zpuid": "7" }],
    },
  }]);
  const res = await userList.execute(
    {
      "portalId": "1",
      "userType": "1",
      "viewType": "1",
      "sort": "alphabetical:asc",
      "page": 2,
      "perPage": 50,
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/users");
  assertEquals(Object.fromEntries(url.searchParams), {
    "type": "1",
    "view_type": "1",
    "sort": "alphabetical:asc",
    "page": "2",
    "per_page": "50",
  });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.items, [{ "zpuid": "7" }]);
  assertEquals(res.hasNext, true);
  assertEquals(res.page, 2);
});
