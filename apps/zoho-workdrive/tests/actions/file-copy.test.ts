import { assertEquals } from "@std/assert";
import fileCopy from "../../actions/file-copy.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("file-copy: POST /workdrive/api/v1/files/d2/copy", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{
    body: { "data": [{ "id": "r1", "type": "files" }] },
  }]);
  const res = await fileCopy.execute(
    { "sourceId": "s1", "destinationFolderId": "d2" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.zohoapis.com");
  assertEquals(url.pathname, "/workdrive/api/v1/files/d2/copy");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": { "type": "files", "attributes": { "resource_id": "s1" } },
  });
  assertEquals(res.item, [{ "id": "r1", "type": "files" }]);
});
