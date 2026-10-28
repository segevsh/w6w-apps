import { assertEquals } from "@std/assert";
import fileRename from "../../actions/file-rename.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("file-rename: PATCH /workdrive/api/v1/files/f1", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{
    body: { "data": { "id": "r1", "type": "files", "attributes": { "name": "n" } } },
  }]);
  const res = await fileRename.execute(
    { "resourceId": "f1", "name": "new" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.zohoapis.com");
  assertEquals(url.pathname, "/workdrive/api/v1/files/f1");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": { "type": "files", "attributes": { "name": "new" } },
  });
  assertEquals(res.item, { "id": "r1", "type": "files", "attributes": { "name": "n" } });
});
