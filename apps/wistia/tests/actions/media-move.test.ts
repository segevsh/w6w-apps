import { assert, assertEquals } from "@std/assert";
import mediaMove from "../../actions/media-move.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("media-move: calls PUT /modern/medias/move with the version header", async () => {
  const { ctx, calls } = mockCtx([{ body: { "ok": true, "hashed_id": "h1" } }]);
  const out = await mediaMove.execute(
    { "hashedIds": "a,b", "folderId": "f1", "subfolderId": "s1" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).origin, "https://api.wistia.com");
  assertEquals(pathOf(calls[0].url), "/modern/medias/move");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["x-wistia-api-version"], "2026-09");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "hashed_ids": ["a", "b"],
    "folder_id": "f1",
    "subfolder_id": "s1",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assert(out.ok === true);
});

Deno.test("media-move: surfaces a Wistia error with its code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized_scope", error: "Token lacks scope." },
  }]);
  let message = "";
  try {
    await mediaMove.execute(
      { "hashedIds": "a,b", "folderId": "f1", "subfolderId": "s1" } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Wistia 401 unauthorized_scope"), message);
  assert(message.includes("Token lacks scope."), message);
});

Deno.test("media-move: refuses more than 100 media and sends nothing", async () => {
  const { ctx, calls } = mockCtx([]);
  const ids = Array.from({ length: 101 }, (_, i) => `m${i}`);
  let message = "";
  try {
    await mediaMove.execute({ hashedIds: ids, folderId: "f1" } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("at most 100"));
  assertEquals(calls.length, 0);
});

Deno.test("media-move: requires at least one hashed ID", async () => {
  const { ctx } = mockCtx([]);
  let message = "";
  try {
    await mediaMove.execute({ hashedIds: "", folderId: "f1" } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("hashedIds is required"));
});
