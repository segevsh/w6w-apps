import { assertEquals, assertRejects } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import {
  ACCEPT_HEADER,
  API_VERSION,
  hostFor,
  HOSTS,
  pathId,
  rateLimitFromHeaders,
  RecurlyClient,
} from "../../lib/client.ts";

Deno.test("client: API_VERSION and ACCEPT_HEADER agree", () => {
  assertEquals(API_VERSION, "v2021-02-25");
  assertEquals(ACCEPT_HEADER, "application/vnd.recurly.v2021-02-25+json");
});

Deno.test("client: hostFor maps region to the two documented data-center hosts", () => {
  assertEquals(hostFor(undefined), HOSTS.us);
  assertEquals(hostFor({ region: "us" }), "v3.recurly.com");
  assertEquals(hostFor({ region: "eu" }), "v3.eu.recurly.com");
});

Deno.test("client: pathId percent-encodes a path segment", () => {
  assertEquals(pathId("code-bob marley"), "code-bob%20marley");
  assertEquals(pathId("uuid-123457890"), "uuid-123457890");
});

Deno.test("client: request GETs the connection's host and sends the version header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { object: "list", data: [] } }]);
  await RecurlyClient.fromConnection(connected(ctx)).request("/accounts");
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).origin, "https://v3.recurly.com");
  assertEquals(new URL(calls[0].url).pathname, "/accounts");
  assertEquals(calls[0].headers["accept"], ACCEPT_HEADER);
});

Deno.test("client: request builds a query string, dropping empty/undefined values", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { object: "list", data: [] } }]);
  await RecurlyClient.fromConnection(connected(ctx)).request("/accounts", {
    query: { limit: 20, order: "asc", email: "", subscriber: undefined, past_due: true },
  });
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("limit"), "20");
  assertEquals(q.get("order"), "asc");
  assertEquals(q.get("email"), null);
  assertEquals(q.get("subscriber"), null);
  assertEquals(q.get("past_due"), "true");
});

Deno.test("client: request joins array query values with commas (the `ids` wire form)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { object: "list", data: [] } }]);
  await RecurlyClient.fromConnection(connected(ctx)).request("/accounts", {
    query: { ids: ["a1", "a2", "a3"] },
  });
  assertEquals(new URL(calls[0].url).searchParams.get("ids"), "a1,a2,a3");
});

Deno.test("client: request on a path that already has a query string ignores `options.query`", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { object: "list", data: [] } }]);
  await RecurlyClient.fromConnection(connected(ctx)).request("/accounts?cursor=abc&limit=5", {
    query: { limit: 999 },
  });
  assertEquals(calls[0].url, "https://v3.recurly.com/accounts?cursor=abc&limit=5");
});

Deno.test("client: request sends a JSON body and infers POST when a method is not given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "a1" } }]);
  await RecurlyClient.fromConnection(connected(ctx)).request("/accounts", {
    json: { code: "bob" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { code: "bob" });
});

Deno.test("client: request respects an explicit method with a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "a1" } }]);
  await RecurlyClient.fromConnection(connected(ctx)).request("/accounts/a1", {
    method: "PUT",
    json: { email: "a@b.com" },
  });
  assertEquals(calls[0].method, "PUT");
});

Deno.test("client: request throws with the vendor's own type + message on a non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { type: "invalid_api_key", message: "Invalid API key." } },
  ]);
  await assertRejects(
    () => RecurlyClient.fromConnection(connected(ctx)).request("/accounts"),
    Error,
    "Recurly 401 (invalid_api_key)",
  );
});

Deno.test("client: request falls back to the status when the error body is not JSON", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "<html>oops</html>" }]);
  await assertRejects(
    () => RecurlyClient.fromConnection(connected(ctx)).request("/accounts"),
    Error,
    "Recurly 500",
  );
});

Deno.test("client: request returns undefined for an empty body", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const result = await RecurlyClient.fromConnection(connected(ctx)).request("/accounts/a1", {
    method: "DELETE",
  });
  assertEquals(result, undefined);
});

Deno.test("rateLimitFromHeaders: reads limit, remaining and converts reset to ISO", () => {
  const headers = new Headers({
    "x-ratelimit-limit": "1000",
    "x-ratelimit-remaining": "998",
    "x-ratelimit-reset": "1735689600",
  });
  const out = rateLimitFromHeaders(headers);
  assertEquals(out.limit, 1000);
  assertEquals(out.remaining, 998);
  assertEquals(out.resetAt, new Date(1735689600 * 1000).toISOString());
});

Deno.test("rateLimitFromHeaders: returns an empty object when no rate-limit headers exist", () => {
  assertEquals(rateLimitFromHeaders(new Headers()), {});
});
