import { assertEquals } from "@std/assert";
import teamFolderFileList from "../../actions/team-folder-file-list.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("team-folder-file-list: GET /workdrive/api/v1/teamfolders/tf1/files", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{
    body: {
      "data": [{ "id": "a1", "type": "files" }, { "id": "a2", "type": "files" }],
      "links": { "cursor": { "has_next": true, "next": "https://x/next" } },
    },
  }]);
  const res = await teamFolderFileList.execute(
    { "teamFolderId": "tf1", "next": "0", "filterType": "folder" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.zohoapis.com");
  assertEquals(url.pathname, "/workdrive/api/v1/teamfolders/tf1/files");
  assertEquals(Object.fromEntries(url.searchParams), {
    "page[next]": "0",
    "filter[type]": "folder",
  });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals((res.items as unknown[]).length, 2);
  assertEquals(res.hasNext, true);
  assertEquals(res.next, "https://x/next");
});
