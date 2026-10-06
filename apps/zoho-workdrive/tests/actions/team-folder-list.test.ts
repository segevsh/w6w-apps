import { assertEquals } from "@std/assert";
import teamFolderList from "../../actions/team-folder-list.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("team-folder-list: GET /workdrive/api/v1/teams/t1/teamfolders", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{
    body: {
      "data": [{ "id": "a1", "type": "files" }, { "id": "a2", "type": "files" }],
      "links": { "cursor": { "has_next": true, "next": "https://x/next" } },
    },
  }]);
  const res = await teamFolderList.execute(
    { "teamId": "t1", "type": "userjoinedws", "limit": 10, "offset": 20 } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.zohoapis.com");
  assertEquals(url.pathname, "/workdrive/api/v1/teams/t1/teamfolders");
  assertEquals(Object.fromEntries(url.searchParams), {
    "filter[type]": "userjoinedws",
    "page[limit]": "10",
    "page[offset]": "20",
  });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals((res.items as unknown[]).length, 2);
  assertEquals(res.hasNext, true);
  assertEquals(res.next, "https://x/next");
});
