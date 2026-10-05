import { assertEquals, assertRejects, assertStringIncludes, assertThrows } from "@std/assert";
import {
  asJsonObject,
  compact,
  cursorFromLink,
  encodeId,
  formatRipplingError,
  normalizeCursor,
  RipplingClient,
  toCsv,
  truncate,
} from "../../lib/client.ts";
import { errorBody, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("cursorFromLink: lifts the cursor out of next_link and decodes it", () => {
  assertEquals(
    cursorFromLink("https://rest.ripplingapis.com/users?cursor=cD01ODNmZDg5MDA1ZWQy%3D&limit=25"),
    "cD01ODNmZDg5MDA1ZWQy=",
  );
  assertEquals(cursorFromLink(null), null);
  assertEquals(cursorFromLink("not a url"), null);
  assertEquals(cursorFromLink("https://rest.ripplingapis.com/users?limit=2"), null);
});

Deno.test("normalizeCursor: bare token passes through, a URL is reduced, blank is dropped", () => {
  assertEquals(normalizeCursor("abc="), "abc=");
  assertEquals(normalizeCursor("  abc  "), "abc");
  assertEquals(normalizeCursor("https://evil.example/x?cursor=zzz"), "zzz");
  assertEquals(normalizeCursor("https://evil.example/x"), undefined);
  assertEquals(normalizeCursor(""), undefined);
  assertEquals(normalizeCursor(undefined), undefined);
});

Deno.test("toCsv / compact / encodeId / truncate", () => {
  assertEquals(toCsv(["user", " manager "]), "user,manager");
  assertEquals(toCsv("user, manager,,"), "user,manager");
  assertEquals(toCsv(""), undefined);
  assertEquals(toCsv(undefined), undefined);
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: 0, f: false }), {
    a: 1,
    e: 0,
    f: false,
  });
  assertEquals(encodeId(" a/b c "), "a%2Fb%20c");
  assertEquals(truncate("x".repeat(10), 20), "x".repeat(10));
  assertStringIncludes(truncate("x".repeat(30), 10), "30 bytes truncated");
});

Deno.test("asJsonObject: object, JSON string, and the three refusals", () => {
  assertEquals(asJsonObject({ a: 1 }, "f"), { a: 1 });
  assertEquals(asJsonObject('{"a":1}', "f"), { a: 1 });
  assertThrows(() => asJsonObject("", "f"), Error, "f is required");
  assertThrows(() => asJsonObject("{x", "f"), Error, "f is not valid JSON");
  assertThrows(() => asJsonObject("[1]", "f"), Error, "f must be a JSON object");
  assertThrows(() => asJsonObject(null, "f"), Error, "f must be a JSON object");
});

Deno.test("formatRipplingError: reads the {ok,error} body, adds the request id and status hints", () => {
  const e401 = formatRipplingError(
    401,
    "GET",
    "/companies/",
    JSON.stringify(errorBody("Incorrect authentication credentials.")),
    "Root=1-x",
  );
  assertStringIncludes(e401, "Rippling 401 for GET /companies/");
  assertStringIncludes(e401, "Incorrect authentication credentials.");
  assertStringIncludes(e401, "[request Root=1-x]");

  assertStringIncludes(formatRipplingError(429, "GET", "/x", "{}"), "300 requests per 10 seconds");
  assertStringIncludes(formatRipplingError(403, "GET", "/x", "{}"), "scope");
  assertStringIncludes(
    formatRipplingError(502, "GET", "/x", "<html>bad gateway</html>"),
    "bad gateway",
  );
});

Deno.test("RipplingClient: sends accept, sets content-type only with a body, skips empty query values", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { ok: 1 } }, { status: 200, body: {} }]);
  const client = new RipplingClient(ctx);
  await client.json("/workers/", {
    query: { limit: 5, filter: "", expand: undefined, cursor: null },
  });
  await client.json("/teams/", { method: "POST", body: { name: "x" } });

  assertEquals(queryOf(calls[0].url), { limit: "5" });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[1].headers["content-type"], "application/json");
  assertEquals(calls[1].body, '{"name":"x"}');
});

Deno.test("RipplingClient: 204 and empty bodies resolve to undefined; non-2xx throws", async () => {
  const { ctx } = mockCtx([
    { status: 204 },
    { status: 200, body: "" },
    { status: 500, body: "boom" },
  ]);
  const client = new RipplingClient(ctx);
  assertEquals(await client.json("/a/", { method: "DELETE" }), undefined);
  assertEquals(await client.json("/b/"), undefined);
  await assertRejects(() => client.json("/c/"), Error, "Rippling 500 for GET /c/");
});
