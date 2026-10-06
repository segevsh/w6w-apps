import { assert, assertEquals } from "@std/assert";
import folderCreate from "../../actions/folder-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("folder-create: calls POST /modern/folders with the version header", async () => {
  const { ctx, calls } = mockCtx([{ body: { "ok": true, "hashed_id": "h1" } }]);
  const out = await folderCreate.execute(
    {
      "name": " Promo ",
      "adminEmail": "a@b.co",
      "public": false,
      "anonymousCanUpload": true,
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).origin, "https://api.wistia.com");
  assertEquals(pathOf(calls[0].url), "/modern/folders");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["x-wistia-api-version"], "2026-09");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "Promo",
    "adminEmail": "a@b.co",
    "public": false,
    "anonymousCanUpload": true,
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assert(out.ok === true);
});

Deno.test("folder-create: surfaces a Wistia error with its code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized_scope", error: "Token lacks scope." },
  }]);
  let message = "";
  try {
    await folderCreate.execute(
      {
        "name": " Promo ",
        "adminEmail": "a@b.co",
        "public": false,
        "anonymousCanUpload": true,
      } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Wistia 401 unauthorized_scope"), message);
  assert(message.includes("Token lacks scope."), message);
});

Deno.test("folder-create: sends camelCase body fields and is not idempotent", async () => {
  assertEquals(folderCreate.idempotent, false);
  const { ctx, calls } = mockCtx([{ status: 201, body: { hashed_id: "f9" } }]);
  const out = await folderCreate.execute({ name: "X", personalLibrary: true } as never, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "X", personalLibrary: true });
  assertEquals((out as { hashed_id: string }).hashed_id, "f9");
});

Deno.test("folder-create: requires a name", async () => {
  const { ctx } = mockCtx([]);
  let message = "";
  try {
    await folderCreate.execute({ name: " " } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("name is required"));
});
