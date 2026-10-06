import { assertEquals } from "@std/assert";
import fileDeletePermanent from "../../actions/file-delete-permanent.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("file-delete-permanent: PATCH /workdrive/api/v1/files/f1", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{
    body: { "data": [{ "id": "r1", "type": "files" }] },
  }]);
  const res = await fileDeletePermanent.execute({ "resourceId": "f1" } as never, ctx) as Record<
    string,
    unknown
  >;

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
    "data": { "type": "files", "attributes": { "status": "61" } },
  });
  assertEquals(res.item, [{ "id": "r1", "type": "files" }]);
});
