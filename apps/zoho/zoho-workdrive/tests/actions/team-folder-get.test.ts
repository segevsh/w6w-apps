import { assertEquals } from "@std/assert";
import teamFolderGet from "../../actions/team-folder-get.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("team-folder-get: GET /workdrive/api/v1/teamfolders/tf1", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{
    body: { "data": { "id": "tf1", "type": "teamfolders" } },
  }]);
  const res = await teamFolderGet.execute({ "teamFolderId": "tf1" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.zohoapis.com");
  assertEquals(url.pathname, "/workdrive/api/v1/teamfolders/tf1");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.item, { "id": "tf1", "type": "teamfolders" });
});
