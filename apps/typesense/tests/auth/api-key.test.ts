import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

const credential = { host: "https://search.internal:8108", apiKey: "xyz" };

/** The header, not a bearer token. */
Deno.test("api-key: signs with X-TYPESENSE-API-KEY", () => {
  const request = { url: "https://x", headers: {} as Record<string, string> };
  const signed = auth.sign!({ request, credential } as never, mockCtx([]).ctx) as typeof request;
  assertEquals(signed.headers["x-typesense-api-key"], "xyz");
  assertEquals(signed.headers["authorization"], undefined);
});

Deno.test("api-key: exchange normalises the host once, at connect time", () => {
  const stored = auth.exchange!(
    { fields: { host: "search.internal", apiKey: "xyz" } },
    mockCtx([]).ctx,
  ) as Record<string, unknown>;
  assertEquals(stored.host, "https://search.internal:8108");
  assertThrows(
    () => auth.exchange!({ fields: { host: "search.internal" } }, mockCtx([]).ctx),
    Error,
    "`apiKey` is required",
  );
});

/** /health needs no key, so it cannot test one. */
Deno.test("api-key: tests against /collections, never /health", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: [{ name: "products" }] },
    { status: 200, body: { keys: [{ actions: ["*"] }] } },
  ]);
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(calls[0].url, "https://search.internal:8108/collections");
  assert(!calls.some((call) => call.url.endsWith("/health")), "it must not probe /health");
  assertEquals(result.ok, true);
  assert(/1 collection\b/.test(result.message!), result.message);
});

/** A restricted key is normal, and confusing at the first write. */
Deno.test("api-key: says whether the key is administrative or restricted", async () => {
  const admin = mockCtx([
    { status: 200, body: [] },
    { status: 200, body: { keys: [{}, {}] } },
  ]);
  const adminResult = await auth.test!({ credential } as never, admin.ctx);
  assert(/administrative key/.test(adminResult.message!), adminResult.message);

  const scoped = mockCtx([
    { status: 200, body: [] },
    { status: 401, body: { message: "Forbidden" } },
  ]);
  const scopedResult = await auth.test!({ credential } as never, scoped.ctx);
  assertEquals(scopedResult.ok, true);
  assert(/restricted key/.test(scopedResult.message!), scopedResult.message);
  assert(/`key-list` and `key-create` will refuse/.test(scopedResult.message!));
});

/** The commonest setup mistake, and it looks like the server being down. */
Deno.test("api-key: an unreachable host names port 8108", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("connection refused")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(result.ok, false);
  assert(/port 8108/.test(result.message!), result.message);
});

Deno.test("api-key: a rejected key fails with the header explanation", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Forbidden" } }]);
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(result.ok, false);
  assert(/X-TYPESENSE-API-KEY/.test(result.message!), result.message);
});

Deno.test("api-key: afterConnect records the host and version, never the key", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { version: "30.0" } }]);
  const display = await auth.afterConnect!({ credential }, ctx) as Record<string, unknown>;
  assertEquals(display.host, "https://search.internal:8108");
  assertEquals(display.hostLabel, "search.internal:8108");
  assertEquals(display.version, "30.0");
  assert(!JSON.stringify(display).includes("xyz"), JSON.stringify(display));
});

Deno.test("api-key: afterConnect survives a node that will not answer /debug", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const display = await auth.afterConnect!({ credential }, ctx) as Record<string, unknown>;
  assertEquals(display.version, "");
});

/** The server's own --api-key can drop everything. */
Deno.test("api-key: warns about the bootstrap key in the field hint", () => {
  const field = auth.fields!.find((f) => f.key === "apiKey")!;
  assert(/unrestricted and can drop every collection/.test(field.hint!), field.hint);
});
