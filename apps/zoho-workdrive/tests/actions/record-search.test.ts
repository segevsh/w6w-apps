import { assertEquals } from "@std/assert";
import recordSearch from "../../actions/record-search.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("record-search: GET /workdrive/api/v1/teams/t1/records", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{
    body: {
      "data": [{ "id": "a1", "type": "files" }, { "id": "a2", "type": "files" }],
      "links": { "cursor": { "has_next": true, "next": "https://x/next" } },
    },
  }]);
  const res = await recordSearch.execute(
    { "teamId": "t1", "query": "report", "teamFolderId": "tf1" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.zohoapis.com");
  assertEquals(url.pathname, "/workdrive/api/v1/teams/t1/records");
  assertEquals(Object.fromEntries(url.searchParams), {
    "search[all]": "report",
    "filter[teamFolder]": "tf1",
  });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals((res.items as unknown[]).length, 2);
  assertEquals(res.hasNext, true);
  assertEquals(res.next, "https://x/next");
});
