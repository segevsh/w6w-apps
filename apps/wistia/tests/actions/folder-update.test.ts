import { assert, assertEquals } from "@std/assert";
import folderUpdate from "../../actions/folder-update.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("folder-update: calls PUT /modern/folders/f1 with the version header", async () => {
  const { ctx, calls } = mockCtx([{ body: { "ok": true, "hashed_id": "h1" } }]);
  const out = await folderUpdate.execute(
    { "folderId": "f1", "name": "Renamed", "anonymousCanDownload": true } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).origin, "https://api.wistia.com");
  assertEquals(pathOf(calls[0].url), "/modern/folders/f1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["x-wistia-api-version"], "2026-09");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(calls[0].body!), { "name": "Renamed", "anonymousCanDownload": true });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assert(out.ok === true);
});

Deno.test("folder-update: surfaces a Wistia error with its code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized_scope", error: "Token lacks scope." },
  }]);
  let message = "";
  try {
    await folderUpdate.execute(
      { "folderId": "f1", "name": "Renamed", "anonymousCanDownload": true } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Wistia 401 unauthorized_scope"), message);
  assert(message.includes("Token lacks scope."), message);
});

Deno.test("folder-update: refuses an empty update without calling Wistia", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await folderUpdate.execute({ folderId: "f1" } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("at least one field"));
  assertEquals(calls.length, 0);
});

Deno.test("folder-update: false flags are sent, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await folderUpdate.execute({ folderId: "f1", public: false } as never, ctx);
  assertEquals(JSON.parse(calls[0].body!), { public: false });
});
