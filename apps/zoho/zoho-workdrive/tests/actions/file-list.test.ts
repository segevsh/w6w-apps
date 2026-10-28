import { assertEquals } from "@std/assert";
import fileList from "../../actions/file-list.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("file-list: GET /workdrive/api/v1/files/d1/files", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{
    body: {
      "data": [{ "id": "a1", "type": "files" }, { "id": "a2", "type": "files" }],
      "links": { "cursor": { "has_next": true, "next": "https://x/next" } },
    },
  }]);
  const res = await fileList.execute(
    { "folderId": "d1", "limit": 50, "offset": 50 } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.zohoapis.com");
  assertEquals(url.pathname, "/workdrive/api/v1/files/d1/files");
  assertEquals(Object.fromEntries(url.searchParams), { "page[limit]": "50", "page[offset]": "50" });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals((res.items as unknown[]).length, 2);
  assertEquals(res.hasNext, true);
  assertEquals(res.next, "https://x/next");
});

Deno.test("file-list: a vendor error id surfaces in the message", async () => {
  const { ctx } = mockWorkDriveCtx([{
    status: 404,
    body: { errors: [{ id: "R008", title: "Authorization check failed" }] },
  }]);
  let message = "";
  try {
    await fileList.execute({ "folderId": "d1", "limit": 50, "offset": 50 } as never, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("R008: Authorization check failed"), true, message);
  assertEquals(message.includes("404"), true, message);
});
