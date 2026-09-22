import { assert, assertEquals } from "@std/assert";
import {
  ACCEPT_JSON,
  API_BASE,
  compact,
  encodeId,
  errorText,
  formatScoreAppError,
  isUnauthenticated,
  parseJson,
  resultPath,
  ScoreAppClient,
  scorecardPath,
  truncate,
  UNAUTHENTICATED,
} from "../../lib/client.ts";
import {
  errorBody,
  mockCtx,
  page,
  queryOf,
  queryValuesOf,
  UNAUTHENTICATED_BODY,
} from "../_helpers.ts";

Deno.test("client: the API origin is the real host, not the marketing redirect", () => {
  // api.scoreapp.com and developer.scoreapp.com both 302 to www.scoreapp.com.
  assertEquals(API_BASE, "https://open-api.scoreapp.com");
  assertEquals(ACCEPT_JSON, "application/json");
});

/**
 * The trap this constant exists for: without it, Laravel answers an
 * unauthenticated request with a 302 to its login page instead of the documented
 * JSON error, and every auth failure looks like a redirect problem.
 */
Deno.test("client: every request carries Accept: application/json", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await new ScoreAppClient(ctx).json("/scorecards");

  assertEquals(calls[0].headers.accept, "application/json");
  assertEquals(calls[0].method, "GET");
});

/** Signing is the auth hook's job — the client must never touch a credential. */
Deno.test("client: the client sets no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await new ScoreAppClient(ctx).json("/scorecards");

  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("client: the paginated envelope comes back verbatim", async () => {
  const body = page([{ id: "9e01daab-49c6-428b-9209-b5b0607acad3", status: "live" }]);
  const { ctx } = mockCtx([{ body }]);

  const result = await new ScoreAppClient(ctx).json<Record<string, unknown>>("/scorecards");

  // Not unwrapped to `data`: links/meta are how a workflow decides to keep paging.
  assertEquals(result, body as Record<string, unknown>);
});

Deno.test("client: single-valued query params are set, and unset ones dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await new ScoreAppClient(ctx).json("/scorecards", {
    query: { limit: 50, search: "customer", status: undefined, order_dir: "" },
  });

  assertEquals(queryOf(calls[0].url), { limit: "50", search: "customer" });
});

/** `include[]` is a repeated key, not a comma-joined one — a different request. */
Deno.test("client: repeat params appear once per value, under their own key", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await new ScoreAppClient(ctx).json("/scorecards/1/results/123", {
    repeat: { "include[]": ["answers", "scores"] },
  });

  assertEquals(queryValuesOf(calls[0].url, "include[]"), ["answers", "scores"]);
  // The key repeats, once per value. URLSearchParams percent-encodes the
  // brackets (`include%5B%5D`), which decodes back to `include[]` — the
  // vendor's own documented spelling — before Laravel's query parser sees it.
  assertEquals(calls[0].url.split("?")[1], "include%5B%5D=answers&include%5B%5D=scores");
  assertEquals(calls[0].url.includes("answers,scores"), false, calls[0].url);
});

Deno.test("client: a non-2xx response throws with the vendor's own error string", async () => {
  const { ctx } = mockCtx([{ status: 401, body: UNAUTHENTICATED_BODY }]);

  const error = await new ScoreAppClient(ctx).json("/scorecards").catch((e: Error) => e);

  assert(error instanceof Error);
  assert(/ScoreApp 401 for GET \/scorecards/.test(error.message), error.message);
  assert(error.message.includes(UNAUTHENTICATED), error.message);
});

/**
 * `res.ok` is true for a followed 302 that landed on the login page's HTML, so a
 * status check alone is not enough — the body has to be JSON.
 */
Deno.test("client: a non-JSON body is refused, and the trap is named", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: "<!doctype html><html><body>Redirecting to /login</body></html>" },
  ]);

  const error = await new ScoreAppClient(ctx).json("/scorecards").catch((e: Error) => e);

  assert(error instanceof Error);
  assert(/did not return JSON/.test(error.message), error.message);
  assert(/Accept: application\/json/.test(error.message), error.message);
});

Deno.test("client: compact keeps false and 0, drops undefined, null and empty", () => {
  assertEquals(compact({ a: 0, b: false, c: undefined, d: null, e: "", f: "x" }), {
    a: 0,
    b: false,
    f: "x",
  });
});

Deno.test("client: encodeId leaves both id shapes untouched and escapes separators", () => {
  assertEquals(
    encodeId("9e01daab-49c6-428b-9209-b5b0607acad3"),
    "9e01daab-49c6-428b-9209-b5b0607acad3",
  );
  assertEquals(encodeId("1"), "1");
  assertEquals(encodeId(" 42 "), "42");
  assertEquals(encodeId("../scorecards"), "..%2Fscorecards");
});

Deno.test("client: paths are built from opaque ids, never coerced", () => {
  assertEquals(scorecardPath("1"), "/scorecards/1");
  assertEquals(
    scorecardPath("9e01daab-49c6-428b-9209-b5b0607acad3"),
    "/scorecards/9e01daab-49c6-428b-9209-b5b0607acad3",
  );
  assertEquals(resultPath("1", "123"), "/scorecards/1/results/123");
  assertEquals(
    resultPath("9e01daab-49c6-428b-9209-b5b0607acad3", "abc"),
    "/scorecards/9e01daab-49c6-428b-9209-b5b0607acad3/results/abc",
  );
});

Deno.test("client: the auth failure is classified from the body, not the status", () => {
  assertEquals(errorText(UNAUTHENTICATED_BODY), UNAUTHENTICATED);
  assertEquals(isUnauthenticated(UNAUTHENTICATED_BODY), true);
  assertEquals(errorText({ error: { message: "nested shape" } }), undefined);
  assertEquals(errorText("<html>"), undefined);
  assertEquals(errorText(null), undefined);
  assertEquals(isUnauthenticated({ error: "Something else" }), false);
});

Deno.test("client: parseJson returns undefined rather than throwing", () => {
  assertEquals(parseJson('{"a":1}'), { a: 1 });
  assertEquals(parseJson("not json"), undefined);
});

Deno.test("client: truncate keeps short text and marks the cut", () => {
  assertEquals(truncate("short", 20), "short");
  assert(/bytes truncated/.test(truncate("x".repeat(40), 10)));
});

/** 401, 422 and 429 are three different problems with three different fixes. */
Deno.test("client: the formatter keeps an auth failure, a validation error and a 429 apart", () => {
  const rejected = formatScoreAppError(
    401,
    "GET",
    "/scorecards",
    JSON.stringify(UNAUTHENTICATED_BODY),
  );
  const invalid = formatScoreAppError(
    422,
    "GET",
    "/scorecards/1/results",
    JSON.stringify(errorBody("The limit must not be greater than 100.")),
  );
  const limited = formatScoreAppError(429, "GET", "/scorecards", "");

  assert(/API key is missing or was rejected/.test(rejected), rejected);
  assert(/not an auth failure/.test(invalid), invalid);
  assert(/Validation|must not be greater/.test(invalid), invalid);
  assert(/rate-limits/.test(limited), limited);
  assert(/120/.test(limited), limited);
});

Deno.test("client: the formatter falls back to the raw body when it is not ScoreApp JSON", () => {
  const message = formatScoreAppError(502, "GET", "/scorecards", "<html>bad gateway</html>");

  assert(/ScoreApp 502 for GET \/scorecards/.test(message), message);
  assert(/bad gateway/.test(message), message);
});
