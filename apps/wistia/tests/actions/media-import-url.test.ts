import { assert, assertEquals } from "@std/assert";
import mediaImportUrl from "../../actions/media-import-url.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("media-import-url: calls POST /modern/medias/import_url with the version header", async () => {
  const { ctx, calls } = mockCtx([{ body: { "ok": true, "hashed_id": "h1" } }]);
  const out = await mediaImportUrl.execute(
    { "url": " https://example.com/v.mp4 ", "folderId": "f1" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).origin, "https://api.wistia.com");
  assertEquals(pathOf(calls[0].url), "/modern/medias/import_url");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["x-wistia-api-version"], "2026-09");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "url": "https://example.com/v.mp4",
    "folder_id": "f1",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assert(out.ok === true);
});

Deno.test("media-import-url: surfaces a Wistia error with its code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized_scope", error: "Token lacks scope." },
  }]);
  let message = "";
  try {
    await mediaImportUrl.execute(
      { "url": " https://example.com/v.mp4 ", "folderId": "f1" } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Wistia 401 unauthorized_scope"), message);
  assert(message.includes("Token lacks scope."), message);
});

Deno.test("media-import-url: is not idempotent and requires a url", async () => {
  assertEquals(mediaImportUrl.idempotent, false);
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await mediaImportUrl.execute({ url: " " } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("url is required"));
  assertEquals(calls.length, 0);
});
