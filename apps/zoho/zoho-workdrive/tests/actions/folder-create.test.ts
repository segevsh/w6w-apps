import { assertEquals } from "@std/assert";
import folderCreate from "../../actions/folder-create.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("folder-create: POST /workdrive/api/v1/files", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{
    body: { "data": { "id": "r1", "type": "files", "attributes": { "name": "n" } } },
  }]);
  const res = await folderCreate.execute(
    { "parentId": "p1", "name": "Docs" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.zohoapis.com");
  assertEquals(url.pathname, "/workdrive/api/v1/files");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": { "type": "files", "attributes": { "parent_id": "p1", "name": "Docs" } },
  });
  assertEquals(res.item, { "id": "r1", "type": "files", "attributes": { "name": "n" } });
});
