import { assertEquals } from "@std/assert";
import teamFolderCreate from "../../actions/team-folder-create.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("team-folder-create: POST /workdrive/api/v1/teamfolders", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{
    body: { "data": { "id": "tf9", "type": "teamfolders" } },
  }]);
  const res = await teamFolderCreate.execute(
    {
      "teamId": "t1",
      "name": "Marketing",
      "isPublicWithinTeam": true,
      "description": "d",
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.zohoapis.com");
  assertEquals(url.pathname, "/workdrive/api/v1/teamfolders");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": {
      "type": "teamfolders",
      "attributes": {
        "parent_id": "t1",
        "name": "Marketing",
        "is_public_within_team": true,
        "description": "d",
      },
    },
  });
  assertEquals(res.item, { "id": "tf9", "type": "teamfolders" });
});
