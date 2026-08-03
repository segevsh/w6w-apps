import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  boolString,
  compact,
  csvList,
  csvString,
  DiscourseClient,
  normalizeSiteUrl,
  siteUrlFromConnection,
  unset,
} from "../../lib/client.ts";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";

Deno.test("normalizeSiteUrl: reduces every spelling of a forum URL to a bare origin", () => {
  assertEquals(normalizeSiteUrl("https://forum.example.com"), "https://forum.example.com");
  assertEquals(normalizeSiteUrl("https://forum.example.com/"), "https://forum.example.com");
  assertEquals(normalizeSiteUrl("https://forum.example.com/latest"), "https://forum.example.com");
  assertEquals(normalizeSiteUrl("  https://forum.example.com  "), "https://forum.example.com");
  assertEquals(
    normalizeSiteUrl("https://forum.example.com:8443"),
    "https://forum.example.com:8443",
  );
});

Deno.test("normalizeSiteUrl: a bare host defaults to https, never http", () => {
  // Producing an http:// base from a bare hostname would downgrade the
  // transport the API key travels over.
  assertEquals(normalizeSiteUrl("forum.example.com"), "https://forum.example.com");
  // An explicit http:// is honoured — a self-hosted dev instance is a real case.
  assertEquals(normalizeSiteUrl("http://localhost:3000"), "http://localhost:3000");
});

Deno.test("normalizeSiteUrl: rejects what it cannot turn into an origin", () => {
  assertThrows(() => normalizeSiteUrl(""));
  assertThrows(() => normalizeSiteUrl("   "));
  assertThrows(() => normalizeSiteUrl("https://"));
});

Deno.test("siteUrlFromConnection: reads display, and says so when it is missing", () => {
  assertEquals(
    siteUrlFromConnection({ display: { siteUrl: "https://a.test/" } } as never),
    "https://a.test",
  );
  assertThrows(() => siteUrlFromConnection(undefined), Error, "records no site URL");
  assertThrows(() => siteUrlFromConnection({ display: {} } as never), Error, "records no site URL");
});

Deno.test("compact: drops undefined, null and blank, keeps false and 0", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0, g: "x" }),
    { a: 1, e: false, f: 0, g: "x" },
  );
});

Deno.test("unset: a blank form field is absent, not empty", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
  assertEquals(unset(undefined), undefined);
});

Deno.test("csvString: rebuilds the comma-separated STRING Discourse asks for", () => {
  // Several endpoints type `usernames` / `target_recipients` as a string with
  // the example `username1,username2` — not as a JSON array.
  assertEquals(csvString("alice, bob ,, carol"), "alice,bob,carol");
  assertEquals(csvString(""), undefined);
  assertEquals(csvString("  ,  "), undefined);
  assertEquals(csvString(undefined), undefined);
});

Deno.test("csvList: the array form, for the endpoints that want one", () => {
  assertEquals(csvList("a, b"), ["a", "b"]);
  assertEquals(csvList(""), undefined);
});

Deno.test("boolString: Discourse's lowercase token, per its own boolean convention", () => {
  assertEquals(boolString(true), "true");
  assertEquals(boolString(false), "false");
});

Deno.test("client: builds URLs on the connection's origin and asks for JSON", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { ok: true } }]);
  const out = await new DiscourseClient(ctx).request("/t/42.json");
  assertEquals(calls[0].url, `${SITE_URL}/t/42.json`);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(out, { ok: true });
});

Deno.test("client: never sets an auth header — sign owns that", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await new DiscourseClient(ctx).request("/t/1.json", { method: "POST", body: { a: 1 } });
  const names = Object.keys(calls[0].headers);
  assert(!names.includes("authorization"));
  assert(!names.includes("api-key"));
  assert(!names.includes("api-username"));
});

Deno.test("client: skips blank query values rather than sending empty parameters", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await new DiscourseClient(ctx).request("/latest.json", {
    query: { order: "created", ascending: undefined, per_page: 10, q: "", n: null },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("order"), "created");
  assertEquals(url.searchParams.get("per_page"), "10");
  assertEquals(url.searchParams.has("ascending"), false);
  assertEquals(url.searchParams.has("q"), false);
  assertEquals(url.searchParams.has("n"), false);
});

Deno.test("client: URL-encodes query values instead of concatenating them", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await new DiscourseClient(ctx).request("/search.json", {
    query: { q: "onboarding #howto tags:api after:2026-01-01" },
  });
  assert(calls[0].url.includes("q=onboarding+%23howto+tags%3Aapi+after%3A2026-01-01"));
});

Deno.test("client: sets content-type only when there is a body", async () => {
  const withBody = mockDiscourseCtx([{ body: {} }]);
  await new DiscourseClient(withBody.ctx).request("/posts.json", {
    method: "POST",
    body: { raw: "hi" },
  });
  assertEquals(withBody.calls[0].headers["content-type"], "application/json");
  assertEquals(withBody.calls[0].body, JSON.stringify({ raw: "hi" }));

  const without = mockDiscourseCtx([{ body: {} }]);
  await new DiscourseClient(without.ctx).request("/latest.json");
  assertEquals(without.calls[0].headers["content-type"], undefined);
  assertEquals(without.calls[0].body, null);
});

Deno.test("client: a DELETE keeps its body — Discourse's group route depends on it", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { success: "OK" } }]);
  await new DiscourseClient(ctx).request("/groups/7/members.json", {
    method: "DELETE",
    body: { usernames: "alice" },
  });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(JSON.parse(calls[0].body!), { usernames: "alice" });
});

Deno.test("client: a non-2xx throws with the status and Discourse's own error body", async () => {
  const { ctx } = mockDiscourseCtx([
    { status: 422, statusText: "Unprocessable Entity", body: { errors: ["Title is too short"] } },
  ]);
  let message = "";
  try {
    await new DiscourseClient(ctx).request("/posts.json", { method: "POST", body: {} });
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("422"));
  assert(message.includes("/posts.json"));
  assert(message.includes("Title is too short"));
});

Deno.test("client: 204 and an empty 200 both come back as undefined, not a parse error", async () => {
  const { ctx } = mockDiscourseCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new DiscourseClient(ctx);
  assertEquals(await client.request("/t/1.json", { method: "DELETE" }), undefined);
  assertEquals(await client.request("/t/2.json", { method: "DELETE" }), undefined);
});

Deno.test("client: refuses to build a URL when the connection records no forum", () => {
  const { ctx } = mockDiscourseCtx([]);
  (ctx as { connection?: unknown }).connection = { display: {} };
  assertThrows(() => new DiscourseClient(ctx), Error, "records no site URL");
});
