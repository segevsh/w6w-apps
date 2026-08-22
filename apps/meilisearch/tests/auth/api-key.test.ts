import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: signs as a bearer token, which is what the spec declares", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://search.example.com/stats",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "k1" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer k1");
  assertEquals(auth.type, "bearer");
});

/** A key is meaningless without the address of the instance it belongs to. */
Deno.test("api-key: the instance URL is a required field beside the key", () => {
  const required = auth.fields!.filter((f) => f.required).map((f) => f.key).sort();
  assertEquals(required, ["apiKey", "baseUrl"]);
  assertEquals(auth.fields!.filter((f) => f.type === "secret").map((f) => f.key), ["apiKey"]);
});

Deno.test("api-key: test probes the keys endpoint on the given instance", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }]);
  assertEquals(
    await auth.test!(
      { credential: { apiKey: "k1", baseUrl: "search.example.com" } } as never,
      ctx,
    ),
    { ok: true },
  );
  // The bare hostname was normalised to https at connect time.
  assertEquals(calls[0].url, "https://search.example.com/keys?limit=1");
});

/**
 * A scoped key that cannot list keys is doing exactly what it should. Failing
 * the connection over it would be wrong.
 */
Deno.test("api-key: a 403 is a scoped key, not a bad one", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { code: "invalid_api_key" } }]);
  assertEquals(
    await auth.test!({ credential: { apiKey: "k", baseUrl: "https://x.com" } } as never, ctx),
    { ok: true },
  );
});

Deno.test("api-key: a 401 is a bad key, and other statuses report themselves", async () => {
  const bad = mockCtx([{ status: 401, body: {} }]);
  assertEquals(
    await auth.test!({ credential: { apiKey: "k", baseUrl: "https://x.com" } } as never, bad.ctx),
    { ok: false, message: "Meilisearch rejected the API key (401)" },
  );
  const other = mockCtx([{ status: 502, body: "" }]);
  assertEquals(
    await auth.test!({ credential: { apiKey: "k", baseUrl: "https://x.com" } } as never, other.ctx),
    { ok: false, message: "Meilisearch returned 502" },
  );
});

Deno.test("api-key: a missing field fails before any network call", async () => {
  const noKey = mockCtx([]);
  assertEquals(await auth.test!({ credential: { baseUrl: "https://x.com" } } as never, noKey.ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  const noUrl = mockCtx([]);
  assertEquals(await auth.test!({ credential: { apiKey: "k" } } as never, noUrl.ctx), {
    ok: false,
    message: "credential missing baseUrl",
  });
  assertEquals(noKey.calls.length + noUrl.calls.length, 0);
});

Deno.test("api-key: a malformed URL is reported, not thrown at the host", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test!(
    { credential: { apiKey: "k", baseUrl: "http://" } } as never,
    ctx,
  ) as { ok: boolean; message: string };
  assertEquals(result.ok, false);
  assert(result.message.includes("not a valid URL"), result.message);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect records the URL, index and engine, never the key", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { pkgVersion: "1.15.2" } }]);
  const display = await auth.afterConnect!(
    {
      credential: { apiKey: "supersecret", baseUrl: "search.example.com/", indexUid: " movies " },
    } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display, {
    baseUrl: "https://search.example.com",
    indexUid: "movies",
    engineVersion: "1.15.2",
  });
  assert(!JSON.stringify(display).includes("supersecret"), "the credential leaked into display");
});

Deno.test("api-key: a failed version lookup still connects", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  assertEquals(
    await auth.afterConnect!(
      { credential: { apiKey: "k", baseUrl: "https://x.com" } } as never,
      ctx,
    ),
    { baseUrl: "https://x.com", indexUid: undefined },
  );
});
