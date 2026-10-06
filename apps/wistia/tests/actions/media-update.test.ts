import { assert, assertEquals } from "@std/assert";
import mediaUpdate from "../../actions/media-update.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("media-update: calls PUT /modern/medias/abc with the version header", async () => {
  const { ctx, calls } = mockCtx([{ body: { "ok": true, "hashed_id": "h1" } }]);
  const out = await mediaUpdate.execute(
    { "mediaId": "abc", "name": "New", "tags": "x,y", "newStillMediaId": "img1" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).origin, "https://api.wistia.com");
  assertEquals(pathOf(calls[0].url), "/modern/medias/abc");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["x-wistia-api-version"], "2026-09");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "New",
    "tags": ["x", "y"],
    "new_still_media_id": "img1",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assert(out.ok === true);
});

Deno.test("media-update: surfaces a Wistia error with its code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized_scope", error: "Token lacks scope." },
  }]);
  let message = "";
  try {
    await mediaUpdate.execute(
      { "mediaId": "abc", "name": "New", "tags": "x,y", "newStillMediaId": "img1" } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Wistia 401 unauthorized_scope"), message);
  assert(message.includes("Token lacks scope."), message);
});

Deno.test("media-update: refuses an empty update without calling Wistia", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await mediaUpdate.execute({ mediaId: "abc" } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("at least one field"));
  assertEquals(calls.length, 0);
});
