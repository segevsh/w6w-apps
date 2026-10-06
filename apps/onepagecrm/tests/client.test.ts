import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  buildQuery,
  encodeId,
  errorParts,
  isThrottled,
  listResult,
  OnePageClient,
  toList,
} from "../lib/client.ts";
import { envelope, errorBody, mockCtx } from "./_helpers.ts";

Deno.test("errorParts: reads error_name and message; ignores success envelopes", () => {
  assertEquals(errorParts(errorBody("invalid_login", "bad")), {
    name: "invalid_login",
    message: "bad",
  });
  assertEquals(errorParts(envelope({})), {});
  assertEquals(errorParts(null), {});
  assertEquals(errorParts([1]), {});
});

Deno.test("isThrottled: 429, and 403 only with the text/plain Rate Limit Exceeded body", () => {
  assertEquals(isThrottled(429, null, ""), true);
  assertEquals(isThrottled(403, "text/plain; charset=utf-8", "Rate Limit Exceeded"), true);
  assertEquals(isThrottled(403, "application/json", '{"error_name":"no_permission"}'), false);
  assertEquals(isThrottled(403, "text/plain", "Forbidden"), false);
  assertEquals(isThrottled(401, "text/plain", "Rate Limit Exceeded"), false);
});

Deno.test("buildQuery: drops unset/blank, spells booleans, joins arrays, keeps 0 and false", () => {
  assertEquals(buildQuery({}), "");
  assertEquals(
    buildQuery({ a: undefined, b: null, c: "", d: 0, e: false, f: ["x", "y"], g: [], h: "q r" }),
    "?d=0&e=false&f=x%2Cy&h=q+r",
  );
});

Deno.test("toList / encodeId", () => {
  assertEquals(toList(" a, b ,,"), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(encodeId("a/b"), "a%2Fb");
});

Deno.test("listResult: maps paging state and tolerates a missing list", () => {
  assertEquals(
    listResult({ x: [1], total_count: 5, page: 2, per_page: 1, max_page: 5 }, "x"),
    { items: [1], totalCount: 5, page: 2, perPage: 1, maxPage: 5 },
  );
  assertEquals(listResult(undefined, "x").items, []);
});

Deno.test("client: HTTP 403 text/plain is reported as a throttle with the back-off hint", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    headers: { "content-type": "text/plain" },
    body: "Rate Limit Exceeded",
  }]);
  const err = await assertRejects(() => new OnePageClient(ctx).data("/contacts"), Error);
  assert(err.message.includes("throttled") && err.message.includes("HTTP 403"));
});

Deno.test("client: 429 is a throttle too", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: "slow down",
    headers: { "content-type": "text/plain" },
  }]);
  const err = await assertRejects(() => new OnePageClient(ctx).data("/contacts"), Error);
  assert(err.message.includes("throttled"));
});

Deno.test("client: bad credentials mention the user id / key check", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("invalid_login", "Invalid login data provided"),
  }]);
  const err = await assertRejects(() => new OnePageClient(ctx).data("/users"), Error);
  assert(err.message.includes("invalid_login") && err.message.includes("user ID and API key"));
});

Deno.test("client: a non-JSON error body is truncated into the message", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>" + "x".repeat(500) + "</html>" }]);
  const err = await assertRejects(() => new OnePageClient(ctx).data("/users"), Error);
  assert(err.message.includes("HTTP 502") && err.message.length < 400);
});

Deno.test("client: an HTTP 200 carrying an error envelope is still an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorBody("invalid_request_data", "hm") }]);
  await assertRejects(
    () => new OnePageClient(ctx).data("/contacts"),
    Error,
    "invalid_request_data",
  );
});

Deno.test("client: never adds an Authorization header; sends Accept: application/json", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await new OnePageClient(ctx).data("/users");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["accept"], "application/json");
});
