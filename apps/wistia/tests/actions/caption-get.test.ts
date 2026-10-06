import { assert, assertEquals } from "@std/assert";
import captionGet from "../../actions/caption-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("caption-get: calls GET /modern/medias/abc/captions/zh-Hant with the version header", async () => {
  const { ctx, calls } = mockCtx([{ body: { "ok": true, "hashed_id": "h1" } }]);
  const out = await captionGet.execute(
    { "mediaId": "abc", "languageCode": "zh-Hant", "include": "segments" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).origin, "https://api.wistia.com");
  assertEquals(pathOf(calls[0].url), "/modern/medias/abc/captions/zh-Hant");
  assertEquals(queryOf(calls[0].url), { "include": "segments" });
  assertEquals(calls[0].headers["x-wistia-api-version"], "2026-09");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].body, null);
  assert(out.ok === true);
});

Deno.test("caption-get: surfaces a Wistia error with its code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized_scope", error: "Token lacks scope." },
  }]);
  let message = "";
  try {
    await captionGet.execute(
      { "mediaId": "abc", "languageCode": "zh-Hant", "include": "segments" } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Wistia 401 unauthorized_scope"), message);
  assert(message.includes("Token lacks scope."), message);
});

Deno.test("caption-get: requires a language code", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await captionGet.execute({ mediaId: "abc", languageCode: " " } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("languageCode is required"));
  assertEquals(calls.length, 0);
});
