import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { compact, GotifyClient, json, normalizeBaseUrl, num } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("normalizeBaseUrl: adds https when no scheme is given", () => {
  assertEquals(normalizeBaseUrl("gotify.example.com"), "https://gotify.example.com");
});

Deno.test("normalizeBaseUrl: keeps an explicit http:// for local/private networks", () => {
  assertEquals(normalizeBaseUrl("http://192.168.1.10:8080"), "http://192.168.1.10:8080");
});

Deno.test("normalizeBaseUrl: strips a trailing path", () => {
  assertEquals(normalizeBaseUrl("https://gotify.example.com/"), "https://gotify.example.com");
  assertEquals(
    normalizeBaseUrl("https://gotify.example.com/message"),
    "https://gotify.example.com",
  );
});

Deno.test("normalizeBaseUrl: rejects an empty URL", () => {
  assertThrows(() => normalizeBaseUrl(""));
});

Deno.test("num: treats '', null and undefined as unset, keeps 0", () => {
  assertEquals(num(""), undefined);
  assertEquals(num(null), undefined);
  assertEquals(num(undefined), undefined);
  assertEquals(num(0), 0);
  assertEquals(num("42"), 42);
});

Deno.test("json: parses a string, passes through a live value, rejects bad JSON", () => {
  assertEquals(json('{"a":1}', "extras"), { a: 1 });
  assertEquals(json({ a: 1 }, "extras"), { a: 1 });
  assertEquals(json(undefined, "extras"), undefined);
  assertThrows(() => json("{not json", "extras"));
});

Deno.test("compact: drops undefined/null/empty-string values, keeps 0 and false", () => {
  assertEquals(compact({ a: 0, b: false, c: undefined, d: null, e: "", f: "x" }), {
    a: 0,
    b: false,
    f: "x",
  });
});

Deno.test("GotifyClient: a non-ok response surfaces Gotify's errorDescription, not just the status", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized", errorCode: 401, errorDescription: "invalid access token" },
  }], { display: { baseUrl: "https://gotify.example.com" } });
  const client = new GotifyClient(ctx);
  await assertRejects(
    () => client.request("/current/user"),
    Error,
    "invalid access token",
  );
});

Deno.test("GotifyClient: a 204/empty body resolves to undefined rather than throwing on JSON.parse", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }], {
    display: { baseUrl: "https://gotify.example.com" },
  });
  const client = new GotifyClient(ctx);
  const result = await client.request("/message");
  assertEquals(result, undefined);
});
