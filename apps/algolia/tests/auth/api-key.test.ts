import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

/** Algolia authenticates with two headers, which is why this is `custom`. */
Deno.test("api-key: is a custom auth stamping both Algolia headers", async () => {
  assertEquals(auth.type, "custom");
  const { ctx } = mockCtx();
  const request = {
    url: "https://appid.algolia.net/1/indexes/products",
    method: "POST" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { appId: "APPID", apiKey: "secret" } },
    ctx,
  );
  assertEquals(out.headers["x-algolia-application-id"], "APPID");
  assertEquals(out.headers["x-algolia-api-key"], "secret");
});

Deno.test("api-key: the app id is a plain field, the key is the only secret", () => {
  const appId = auth.fields!.find((f) => f.key === "appId")!;
  const key = auth.fields!.find((f) => f.key === "apiKey")!;
  // The app id is part of the hostname and Algolia ships it to browsers.
  assertEquals(appId.type, "string");
  assertEquals(key.type, "secret");
});

/**
 * The probe describes the key itself, which needs no ACL — an index list would
 * need `listIndexes` and would report a working search-only key as broken.
 */
Deno.test("api-key: test describes the key, so a search-only key passes", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { acl: ["search"] } }]);
  const result = await auth.test!(
    { credential: { appId: "APPID", apiKey: "sk" } } as never,
    ctx,
  );
  assertEquals(result, { ok: true });
  // The hook builds this as a plain string, so no URL host-lowercasing here.
  assertEquals(calls[0].url, "https://APPID-dsn.algolia.net/1/keys/sk");
  assertEquals(calls[0].headers["x-algolia-application-id"], "APPID");
});

Deno.test("api-key: 401/403 and 404 are different problems and say so", async () => {
  for (const status of [401, 403]) {
    const { ctx } = mockCtx([{ status, body: {} }]);
    const r = await auth.test!({ credential: { appId: "A", apiKey: "k" } } as never, ctx) as {
      ok: boolean;
      message: string;
    };
    assertEquals(r.ok, false);
    assert(r.message.includes(String(status)), r.message);
  }
  const { ctx } = mockCtx([{ status: 404, body: {} }]);
  const r = await auth.test!({ credential: { appId: "A", apiKey: "k" } } as never, ctx) as {
    ok: boolean;
    message: string;
  };
  assert(r.message.includes("no such application"), r.message);
});

Deno.test("api-key: an incomplete credential fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test!({ credential: { apiKey: "k" } } as never, ctx), {
    ok: false,
    message: "credential missing appId",
  });
  assertEquals(await auth.test!({ credential: { appId: "A" } } as never, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect records the app id and ACLs, never the key", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { acl: ["search", "addObject"], description: "indexing key", indexes: ["products"] },
  }]);
  const d = await auth.afterConnect!(
    { credential: { appId: "APPID", apiKey: "sup3rsecret" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(d.appId, "APPID");
  assertEquals(d.acl, ["search", "addObject"]);
  assert(!JSON.stringify(d).includes("sup3rsecret"), "the credential leaked into display");
});

Deno.test("api-key: a failed lookup still records the app id actions need", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(
    await auth.afterConnect!({ credential: { appId: "APPID", apiKey: "k" } } as never, ctx),
    { appId: "APPID" },
  );
});
