import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_HOST_SUFFIX,
  API_VERSION,
  asOptionalJson,
  baseUrl,
  compact,
  encodeId,
  formatRelevanceError,
  isAuthInfo,
  regionIdFromConnection,
  RelevanceAiClient,
} from "../../lib/client.ts";
import {
  API_ROOT,
  authInfo,
  bodyOf,
  errorBody,
  mockCtx,
  mockRelevanceCtx,
  pathOf,
  queryOf,
  REGION_ID,
} from "../_helpers.ts";

Deno.test("client: the base URL is built from the region id, and nothing else", () => {
  assertEquals(API_HOST_SUFFIX, "stack.tryrelevance.com");
  assertEquals(API_VERSION, "latest");
  assertEquals(baseUrl("f1db6c"), API_ROOT);
  // The schema's own `region` enum lists ten ids; three are named in the
  // vendor's enterprise docs, so no one of them may be hardcoded anywhere.
  assertEquals(baseUrl("0e489e"), "https://api-0e489e.stack.tryrelevance.com/latest");
});

Deno.test("client: the region id comes from the connection's redacted display", () => {
  assertEquals(
    regionIdFromConnection({
      id: "c",
      app: "io.w6w.relevanceai",
      auth: "api-token",
      owner: "u",
      state: "connected",
      createdAt: "2026-09-22T00:00:00.000Z",
      display: { regionId: "d7b62b", user: { id: "u" } },
    }),
    "d7b62b",
  );
});

Deno.test("client: a connection without a region id fails with a reconnect message", () => {
  for (const connection of [undefined, { display: {} }]) {
    const error = assertThrows(
      () => regionIdFromConnection(connection as never),
      Error,
    );
    assert(/reconnect/.test(error.message), error.message);
    assert(/region id/.test(error.message), error.message);
  }
});

Deno.test("client: compact() drops unset top-level keys and keeps real ones", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
  // Nested payloads are the tool's own business and are never rewritten.
  assertEquals(compact({ params: { name: "", keep: null } }), {
    params: { name: "", keep: null },
  });
});

Deno.test("client: encodeId leaves a valid vendor id alone and neutralises a pasted URL", () => {
  assertEquals(encodeId("a1b2.c3-d4_e5"), "a1b2.c3-d4_e5");
  assertEquals(encodeId("  abc  "), "abc");
  assertEquals(encodeId("a/b?c=d"), "a%2Fb%3Fc%3Dd");
});

Deno.test("client: asOptionalJson() accepts a parsed value, a JSON string, or nothing", () => {
  assertEquals(asOptionalJson([{ field: "x" }], "filters"), [{ field: "x" }]);
  assertEquals(asOptionalJson('{"a":1}', "filters"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "filters"), undefined);
  assertEquals(asOptionalJson("", "filters"), undefined);
  assertThrows(() => asOptionalJson("{oops", "filters"), Error, "filters is not valid JSON");
});

Deno.test("client: a success is recognised by user_id + key_id, not by the status", () => {
  assert(isAuthInfo(authInfo()));
  // The wrong-key body arrives as HTTP 400 and is NOT a success, whatever it is
  // labelled: it has no user_id and no key_id.
  assertEquals(isAuthInfo(errorBody("unset_error_type", "User key with id … not found")), false);
  assertEquals(isAuthInfo({ user_id: "u" }), false);
  assertEquals(isAuthInfo({ key_id: "k" }), false);
  assertEquals(isAuthInfo(null), false);
  assertEquals(isAuthInfo("200"), false);
});

Deno.test("client: errors keep the vendor's error_type and message", () => {
  const formatted = formatRelevanceError(
    400,
    "POST",
    "/latest/agents/trigger",
    JSON.stringify(errorBody("unset_error_type", "User key with id AbC= not found in Postgres")),
  );
  assert(formatted.includes("400"), formatted);
  assert(formatted.includes("unset_error_type"), formatted);
  assert(formatted.includes("not found in Postgres"), formatted);
});

Deno.test("client: a missing Authorization header is named as such", () => {
  const formatted = formatRelevanceError(
    401,
    "GET",
    "/latest/auth/info",
    JSON.stringify(
      errorBody("authorization_header_missing", "Authorization header cannot be missing or empty"),
    ),
  );
  assert(formatted.includes("authorization_header_missing"), formatted);
  assert(/reconnect/.test(formatted), formatted);
});

Deno.test("client: a non-JSON error body is still reported", () => {
  const formatted = formatRelevanceError(
    502,
    "GET",
    "/latest/studios/list",
    "<html>Bad Gateway</html>",
  );
  assert(formatted.includes("502"), formatted);
  assert(formatted.includes("Bad Gateway"), formatted);
});

Deno.test("client: a GET carries the query and never an Authorization header", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ body: { results: [] } }]);
  await new RelevanceAiClient(ctx).json("/studios/list", {
    query: { query: "triage", page: 2, page_size: 20, version: undefined, tool_version: "" },
  });

  assertEquals(calls[0].url, `${API_ROOT}/studios/list?query=triage&page=2&page_size=20`);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/json");
  // Signing is the auth hook's job; the client must not know about credentials.
  assertEquals("authorization" in calls[0].headers, false);
  assertEquals(calls[0].body, null);
});

Deno.test("client: a POST body is compacted and sent as JSON", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ body: { ok: true } }]);
  await new RelevanceAiClient(ctx).json("/agents/trigger", {
    method: "POST",
    body: {
      agent_id: "a1",
      message: { role: "user", content: "hi" },
      conversation_id: undefined,
    },
  });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), {
    agent_id: "a1",
    message: { role: "user", content: "hi" },
  });
});

Deno.test("client: an empty 200 (both cancels) parses to undefined", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ status: 200 }]);
  const out = await new RelevanceAiClient(ctx).json("/agents/a1/cancel", {
    method: "POST",
    body: {},
  });
  assertEquals(out, undefined);
  assertEquals(pathOf(calls[0].url), "/latest/agents/a1/cancel");
});

Deno.test("client: a failed request throws the vendor's own words", async () => {
  const { ctx } = mockRelevanceCtx([
    { status: 422, body: errorBody("unset_error_type", "Agent id is invalid") },
  ]);
  await assertRejects(
    () => new RelevanceAiClient(ctx).json("/agents/list", { method: "POST", body: {} }),
    Error,
    "Agent id is invalid",
  );
});

Deno.test("client: a 200 that is not JSON is reported as such, not silently passed on", async () => {
  const { ctx } = mockRelevanceCtx([{ headers: { "content-type": "text/html" }, body: "<html>x" }]);
  await assertRejects(
    () => new RelevanceAiClient(ctx).json("/studios/list"),
    Error,
    "non-JSON body",
  );
});

Deno.test("client: the connection's host is used, and a different region gives a different host", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ body: {} }], "0e489e");
  await new RelevanceAiClient(ctx).json("/auth/info");
  assertEquals(calls[0].url, "https://api-0e489e.stack.tryrelevance.com/latest/auth/info");
});

Deno.test("client: a context with no connection cannot build a URL at all", () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertThrows(() => new RelevanceAiClient(ctx), Error, "region id");
  assertEquals(REGION_ID, "f1db6c");
  assertEquals(queryOf(`${API_ROOT}/x?a=1`), { a: "1" });
});
