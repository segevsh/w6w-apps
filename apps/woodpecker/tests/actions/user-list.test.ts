import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-list: lists users with pagination data", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "content": [{ "id": 1234, "name": "Michael Scott", "email": "m@dm.com", "role": "admin" }],
      "pagination_data": { "total_elements": 1, "total_pages": 1 },
    },
  }]);
  const out = await userList.execute({ "page": 0, "sort": "-id" } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/users");
  assertEquals(queryOf(calls[0].url), { "page": "0", "sort": "-id" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.count, 1);
  assertEquals((out.pagination as { total_pages: number }).total_pages, 1);
});
