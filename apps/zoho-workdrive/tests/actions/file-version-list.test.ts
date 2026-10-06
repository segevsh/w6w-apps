import { assertEquals } from "@std/assert";
import fileVersionList from "../../actions/file-version-list.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("file-version-list: GET /workdrive/api/v1/files/f1/versions", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{
    body: { "data": [{ "id": "f1-1", "type": "versions" }] },
  }]);
  const res = await fileVersionList.execute({ "resourceId": "f1" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.zohoapis.com");
  assertEquals(url.pathname, "/workdrive/api/v1/files/f1/versions");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals((res.items as unknown[]).length, 1);
});
