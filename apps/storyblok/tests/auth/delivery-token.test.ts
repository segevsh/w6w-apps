import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/delivery-token.ts";

const credential = { token: "pubtok", region: "eu" };
const space = {
  status: 200,
  body: { space: { id: 123, name: "Marketing site", version: 1735645795 } },
};

/** The delivery API takes its credential in the query string, by design. */
Deno.test("delivery-token: signs by adding the token to the URL", () => {
  const request = { url: "https://api.storyblok.com/v2/cdn/stories?version=draft", headers: {} };
  const signed = auth.sign!({ request, credential } as never, mockCtx([]).ctx) as typeof request;
  const url = new URL(signed.url);
  assertEquals(url.searchParams.get("token"), "pubtok");
  assertEquals(url.searchParams.get("version"), "draft", "existing parameters survive");
});

/** The API never says which kind of token it was given. */
Deno.test("delivery-token: distinguishes a preview token by asking for a draft", async () => {
  const preview = mockCtx([space, { status: 200, body: { stories: [] } }]);
  const previewResult = await auth.test!({ credential } as never, preview.ctx);
  assertEquals(new URL(preview.calls[1].url).searchParams.get("version"), "draft");
  assert(/PREVIEW token/.test(previewResult.message!), previewResult.message);
  assert(/treat it as a secret/.test(previewResult.message!), previewResult.message);

  const publicToken = mockCtx([space, { status: 401, body: { error: "Unauthorized" } }]);
  const publicResult = await auth.test!({ credential } as never, publicToken.ctx);
  assertEquals(publicResult.ok, true);
  assert(/PUBLIC token/.test(publicResult.message!), publicResult.message);
  assert(/a draft will read as missing/.test(publicResult.message!), publicResult.message);
});

Deno.test("delivery-token: the region chooses the host", async () => {
  const { ctx, calls } = mockCtx([space, { status: 401, body: {} }]);
  await auth.test!({ credential: { ...credential, region: "us" } } as never, ctx);
  assertEquals(calls[0].url, "https://api-us.storyblok.com/v2/cdn/spaces/me");
});

Deno.test("delivery-token: a rejected token names the region as a possibility", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Unauthorized" } }]);
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(result.ok, false);
  assert(/ANOTHER REGION/.test(result.message!), result.message);
});

/** afterConnect records everything the actions and health check need. */
Deno.test("delivery-token: afterConnect records the kind, region and cache version", async () => {
  const { ctx } = mockCtx([space, { status: 200, body: { stories: [] } }]);
  const display = await auth.afterConnect!({ credential }, ctx) as Record<string, unknown>;
  assertEquals(display.credentialKind, "delivery");
  assertEquals(display.region, "eu");
  assertEquals(display.spaceId, 123);
  assertEquals(display.tokenKind, "preview");
  assertEquals(display.cacheVersion, 1735645795);
  assert(!JSON.stringify(display).includes("pubtok"), JSON.stringify(display));
});

Deno.test("delivery-token: afterConnect survives an unreachable API", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const display = await auth.afterConnect!({ credential }, ctx) as Record<string, unknown>;
  assertEquals(display.credentialKind, "delivery");
  assertEquals(display.tokenKind, "public", "the safer assumption");
});

Deno.test("delivery-token: is declared as a query-parameter key", () => {
  assertEquals(auth.apiKey, { in: "query", name: "token" });
});
