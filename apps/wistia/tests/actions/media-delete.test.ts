import { assert, assertEquals } from "@std/assert";
import mediaDelete from "../../actions/media-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("media-delete: calls DELETE /modern/medias/abc with the version header", async () => {
  const { ctx, calls } = mockCtx([{ body: { "ok": true, "hashed_id": "h1" } }]);
  const out = await mediaDelete.execute({ "mediaId": "abc" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).origin, "https://api.wistia.com");
  assertEquals(pathOf(calls[0].url), "/modern/medias/abc");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["x-wistia-api-version"], "2026-09");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].body, null);
  assert(out.ok === true);
});

Deno.test("media-delete: surfaces a Wistia error with its code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized_scope", error: "Token lacks scope." },
  }]);
  let message = "";
  try {
    await mediaDelete.execute({ "mediaId": "abc" } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Wistia 401 unauthorized_scope"), message);
  assert(message.includes("Token lacks scope."), message);
});

Deno.test("media-delete: encodes the id so it cannot escape the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await mediaDelete.execute({ mediaId: "../folders/f1" } as never, ctx);
  assertEquals(pathOf(calls[0].url), "/modern/medias/..%2Ffolders%2Ff1");
});
