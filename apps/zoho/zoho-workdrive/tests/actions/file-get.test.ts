import { assertEquals } from "@std/assert";
import fileGet from "../../actions/file-get.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("file-get: GET /workdrive/api/v1/files/f1", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{
    body: { "data": { "id": "r1", "type": "files", "attributes": { "name": "n" } } },
  }]);
  const res = await fileGet.execute({ "resourceId": "f1" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.zohoapis.com");
  assertEquals(url.pathname, "/workdrive/api/v1/files/f1");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.item, { "id": "r1", "type": "files", "attributes": { "name": "n" } });
});

Deno.test("file-get: a vendor error id surfaces in the message", async () => {
  const { ctx } = mockWorkDriveCtx([{
    status: 404,
    body: { errors: [{ id: "R008", title: "Authorization check failed" }] },
  }]);
  let message = "";
  try {
    await fileGet.execute({ "resourceId": "f1" } as never, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("R008: Authorization check failed"), true, message);
  assertEquals(message.includes("404"), true, message);
});
