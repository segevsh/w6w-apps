import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: declares the key travels as the `key` query parameter", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "query", name: "key" });
});

Deno.test("api-key: collects one masked secret field", () => {
  assertEquals(auth.fields!.length, 1);
  const field = auth.fields![0];
  assertEquals(field.key, "apiKey");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign appends the key to the URL and preserves existing params", async () => {
  const { ctx } = mockCtx([]);
  const request = {
    url: "https://youtube.googleapis.com/youtube/v3/search?part=snippet&q=cats",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const signed = await auth.sign!({ request, credential: { apiKey: "K" } }, ctx);
  const url = new URL(signed.url);
  assertEquals(url.searchParams.get("key"), "K");
  assertEquals(url.searchParams.get("part"), "snippet");
  assertEquals(url.searchParams.get("q"), "cats");
  // A query-param method must not also stamp a header.
  assertEquals(signed.headers["authorization"], undefined);
});

Deno.test("api-key: sign replaces rather than duplicates an existing key", async () => {
  const { ctx } = mockCtx([]);
  const request = {
    url: "https://youtube.googleapis.com/youtube/v3/search?key=old",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const signed = await auth.sign!({ request, credential: { apiKey: "new" } }, ctx);
  assertEquals(new URL(signed.url).searchParams.getAll("key"), ["new"]);
});

Deno.test("api-key: test probes i18nLanguages.list — public, 1 unit, no scope needed", async () => {
  // The oauth2 method's channels.list?mine=true probe would 401 for a key,
  // which is exactly why the two methods do not share one.
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "en" }] } }]);
  assertEquals(await auth.test({ credential: { apiKey: "K" } }, ctx), { ok: true });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/youtube/v3/i18nLanguages");
  assertEquals(url.searchParams.get("part"), "snippet");
  assertEquals(url.searchParams.get("key"), "K");
});

Deno.test("api-key: test reports a missing key without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await auth.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("apiKey"));
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test surfaces the upstream status on failure", async () => {
  const { ctx } = mockCtx([{ status: 400, body: {} }]);
  const out = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("400"));
});

Deno.test("api-key: says plainly that it is read-only public data", () => {
  assert(/read-only|public data/i.test(auth.displayName + " " + auth.description));
});
