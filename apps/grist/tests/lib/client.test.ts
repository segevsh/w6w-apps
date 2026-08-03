import { assert, assertEquals, assertRejects } from "@std/assert";
import { actionCtx, mockCtx, SITE } from "../_helpers.ts";
import { DEFAULT_SITE_URL, encodeFilter, GristClient, resolveBaseUrl } from "../../lib/client.ts";

Deno.test("resolveBaseUrl: appends /api to the connection's site", () => {
  assertEquals(resolveBaseUrl({ siteUrl: "https://docs.getgrist.com" }), `${SITE}/api`);
  assertEquals(
    resolveBaseUrl({ siteUrl: "https://acme.getgrist.com" }),
    "https://acme.getgrist.com/api",
  );
  assertEquals(
    resolveBaseUrl({ siteUrl: "https://grist.internal.example" }),
    "https://grist.internal.example/api",
  );
});

Deno.test("resolveBaseUrl: trims trailing slashes and an accidentally pasted /api", () => {
  assertEquals(resolveBaseUrl({ siteUrl: "https://docs.getgrist.com/" }), `${SITE}/api`);
  assertEquals(resolveBaseUrl({ siteUrl: "https://docs.getgrist.com///" }), `${SITE}/api`);
  // Pasting the API root itself must not produce /api/api.
  assertEquals(resolveBaseUrl({ siteUrl: "https://docs.getgrist.com/api" }), `${SITE}/api`);
  assertEquals(resolveBaseUrl({ siteUrl: "https://docs.getgrist.com/api/" }), `${SITE}/api`);
  assertEquals(resolveBaseUrl({ siteUrl: "  https://docs.getgrist.com  " }), `${SITE}/api`);
});

Deno.test("resolveBaseUrl: throws when the connection carries no site", () => {
  let threw = false;
  try {
    resolveBaseUrl(undefined);
  } catch {
    threw = true;
  }
  assert(threw, "missing siteUrl must not silently default");
  assertEquals(DEFAULT_SITE_URL, SITE);
});

Deno.test("client: sends accept, and content-type only when there is a body", async () => {
  const { ctx, calls } = actionCtx([{ body: {} }, { body: {} }]);
  const client = GristClient.fromConnection(ctx);
  await client.request("/orgs");
  await client.request("/orgs", { method: "POST", body: { name: "x" } });

  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[1].headers["content-type"], "application/json");
  assertEquals(calls[1].body, '{"name":"x"}');
});

Deno.test("client: never sets an authorization header — that is the sign hook's job", async () => {
  const { ctx, calls } = actionCtx([{ body: {} }]);
  await GristClient.fromConnection(ctx).request("/orgs");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: skips undefined/null/empty query params but keeps false and 0", async () => {
  const { ctx, calls } = actionCtx([{ body: {} }]);
  await GristClient.fromConnection(ctx).request("/x", {
    query: { a: undefined, b: null, c: "", hidden: false, limit: 0, sort: "pet" },
  });
  const url = new URL(calls[0].url);
  assert(!url.searchParams.has("a"));
  assert(!url.searchParams.has("b"));
  assert(!url.searchParams.has("c"));
  // `hidden=false` and `limit=0` are both meaningful to Grist.
  assertEquals(url.searchParams.get("hidden"), "false");
  assertEquals(url.searchParams.get("limit"), "0");
  assertEquals(url.searchParams.get("sort"), "pet");
});

Deno.test("client: 204 and an empty body both resolve to undefined, not a JSON error", async () => {
  const { ctx } = actionCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = GristClient.fromConnection(ctx);
  assertEquals(await client.request("/x"), undefined);
  assertEquals(await client.request("/y"), undefined);
});

Deno.test("client: requestText returns the body verbatim for CSV-style responses", async () => {
  const { ctx } = actionCtx([
    { body: "pet,popularity\ncat,67\n", headers: { "content-type": "text/csv" } },
  ]);
  const text = await GristClient.fromConnection(ctx).requestText("/docs/d/download/csv");
  assertEquals(text, "pet,popularity\ncat,67\n");
});

Deno.test("client: a non-2xx throws with the status and path, and no credential", async () => {
  const { ctx } = actionCtx([{ status: 403, statusText: "Forbidden", body: { error: "nope" } }]);
  const err = await assertRejects(
    () => GristClient.fromConnection(ctx).request("/docs/abc/tables"),
    Error,
  );
  assert(err.message.includes("403"));
  assert(err.message.includes("/api/docs/abc/tables"));
  assert(!/authorization|bearer/i.test(err.message), "error text must not echo a credential");
});

Deno.test("client: fromConnection throws when the ctx has no connection at all", () => {
  const { ctx } = mockCtx([{ body: {} }]);
  let threw = false;
  try {
    GristClient.fromConnection(ctx);
  } catch {
    threw = true;
  }
  assert(threw);
});

Deno.test("encodeFilter: passes a string through and stringifies an object", () => {
  assertEquals(encodeFilter('{"pet":["cat"]}'), '{"pet":["cat"]}');
  assertEquals(encodeFilter({ pet: ["cat", "dog"] }), '{"pet":["cat","dog"]}');
  assertEquals(encodeFilter(undefined), undefined);
  assertEquals(encodeFilter(null), undefined);
  assertEquals(encodeFilter(""), undefined);
});
