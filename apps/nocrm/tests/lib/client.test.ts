import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockNocrmCtx } from "../_helpers.ts";
import {
  baseUrl,
  classifyPing,
  compact,
  formatNocrmError,
  NocrmClient,
  parseNocrmError,
  stringList,
  subdomainFromConnection,
} from "../../lib/client.ts";

Deno.test("client: builds the URL from the connection's subdomain, not a param", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: { id: 1 } }], "acme");
  await new NocrmClient(ctx).request("/v2/leads/1");
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/leads/1");
  // Nothing about the credential is set here — `sign` owns that.
  assertEquals("x-api-key" in calls[0].headers, false);
  assertEquals("x-user-token" in calls[0].headers, false);
});

Deno.test("client: fails loudly when the connection carries no subdomain", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new NocrmClient(ctx), Error, "no subdomain");
});

Deno.test("client: surfaces the vendor's own type and message, not just the status", async () => {
  const { ctx } = mockNocrmCtx([{
    status: 422,
    statusText: "Unprocessable Entity",
    body: '{"error":422,"message":"title is required","type":"missing_parameter"}',
  }]);
  await assertRejects(
    () => new NocrmClient(ctx).request("/v2/leads", { method: "POST", body: {} }),
    Error,
    "[missing_parameter]",
  );
});

Deno.test("client: adds the documented backoff guidance on a 429", async () => {
  const { ctx } = mockNocrmCtx([{
    status: 429,
    body: { error: 429, message: "Too many requests", type: "too_many_requests" },
  }]);
  await assertRejects(
    () => new NocrmClient(ctx).request("/v2/leads"),
    Error,
    "API-RETRY-AFTER",
  );
});

Deno.test("client: falls back to the raw body when the error isn't JSON", async () => {
  const { ctx } = mockNocrmCtx([{ status: 502, body: "bad gateway" }]);
  await assertRejects(() => new NocrmClient(ctx).request("/v2/leads"), Error, "bad gateway");
});

Deno.test("client: list reads X-TOTAL-COUNT off the header beside the bare array", async () => {
  const { ctx, calls } = mockNocrmCtx([{
    body: [{ id: 1 }, { id: 2 }],
    headers: { "content-type": "application/json", "x-total-count": "180" },
  }]);
  const page = await new NocrmClient(ctx).list("/v2/leads", { query: { limit: 2 } });
  assertEquals(page.items, [{ id: 1 }, { id: 2 }]);
  assertEquals(page.totalCount, 180);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/leads?limit=2");
});

Deno.test("client: list leaves totalCount undefined when the header is absent", async () => {
  const { ctx } = mockNocrmCtx([{ body: [] }]);
  const page = await new NocrmClient(ctx).list("/v2/teams");
  assertEquals(page.items, []);
  assertEquals(page.totalCount, undefined);
});

Deno.test("client: query drops unset values but keeps false and 0", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: [] }]);
  await new NocrmClient(ctx).list("/v2/leads", {
    query: { starred: false, offset: 0, email: undefined, tags: "" },
  });
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/leads?starred=false&offset=0");
});

Deno.test("client: request returns undefined for an empty body", async () => {
  const { ctx } = mockNocrmCtx([{ status: 204 }]);
  assertEquals(
    await new NocrmClient(ctx).request("/v2/leads/1", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("subdomainFromConnection: reads the display data afterConnect records", () => {
  assertEquals(subdomainFromConnection({ display: { subdomain: "acme" } } as never), "acme");
  assertThrows(() => subdomainFromConnection(undefined), Error, "no subdomain");
});

Deno.test("baseUrl: builds the per-account host", () => {
  assertEquals(baseUrl("acme"), "https://acme.nocrm.io/api");
});

Deno.test("classifyPing: a 200 body is success", () => {
  assertEquals(
    classifyPing(200, { status: 200, message: "Your API key is correct." }),
    { ok: true },
  );
});

Deno.test("classifyPing: failure is the unauthorized_* type, read from the body", () => {
  for (
    const type of [
      "unauthorized_missing_token",
      "unauthorized_disabled_token",
      "unauthorized_invalid_token",
    ]
  ) {
    assertEquals(classifyPing(401, { error: 401, message: "nope", type }).ok, false);
  }
  assertEquals(
    classifyPing(401, {
      error: 401,
      message: "Unauthorized: invalid api_key",
      type: "unauthorized_invalid_token",
    }),
    { ok: false, message: "Unauthorized: invalid api_key" },
  );
});

Deno.test("classifyPing: an unfamiliar body is not read as success", () => {
  assertEquals(classifyPing(200, {}).ok, false);
  assertEquals(classifyPing(500, {}).ok, false);
  assertEquals(classifyPing(401, {}).ok, false);
});

Deno.test("formatNocrmError/parseNocrmError survive a non-JSON body", () => {
  assertEquals(parseNocrmError("<html>nope</html>"), {});
  assertEquals(
    formatNocrmError(500, "GET", "/api/v2/leads", "<html>nope</html>"),
    "noCRM 500 for GET /api/v2/leads: <html>nope</html>",
  );
});

Deno.test("compact/stringList behave as the other apps' helpers do", () => {
  assertEquals(compact({ a: 1, b: undefined, c: "", d: false, e: 0 }), { a: 1, d: false, e: 0 });
  assertEquals(stringList("a, b"), ["a", "b"]);
  assertEquals(stringList(["a"]), ["a"]);
  assertEquals(stringList(""), undefined);
  assertEquals(stringList(" , "), undefined);
});
