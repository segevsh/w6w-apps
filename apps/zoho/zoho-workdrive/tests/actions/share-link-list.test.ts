import { assertEquals } from "@std/assert";
import shareLinkList from "../../actions/share-link-list.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("share-link-list: GET /workdrive/api/v1/files/f1/links", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{
    body: {
      "data": [{ "id": "a1", "type": "files" }, { "id": "a2", "type": "files" }],
      "links": { "cursor": { "has_next": true, "next": "https://x/next" } },
    },
  }]);
  const res = await shareLinkList.execute(
    { "resourceId": "f1", "type": "download" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.zohoapis.com");
  assertEquals(url.pathname, "/workdrive/api/v1/files/f1/links");
  assertEquals(Object.fromEntries(url.searchParams), { "filter[type]": "download" });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals((res.items as unknown[]).length, 2);
  assertEquals(res.hasNext, true);
  assertEquals(res.next, "https://x/next");
});
