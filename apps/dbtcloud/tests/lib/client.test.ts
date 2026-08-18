import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  accessUrlFromConnection,
  accountIdFromConnection,
  compact,
  csv,
  DbtCloudClient,
  DEFAULT_ACCESS_URL,
  describeError,
  json,
  normalizeAccessUrl,
  query,
  runStatusName,
} from "../../lib/client.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };

Deno.test("compact: drops unset keys so a filter is absent rather than empty", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: [], f: false }), {
    a: 1,
    f: false,
  });
});

Deno.test("query: keeps numbers and booleans, stringifies the rest, drops blanks", () => {
  assertEquals(query({ a: 1, b: true, c: "x", d: "", e: undefined, f: [1, "2"] }), {
    a: 1,
    b: true,
    c: "x",
    f: [1, "2"],
  });
});

Deno.test("csv: splits, trims and drops empties; blank means unset", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
});

Deno.test("json: parses text, passes live values, and names the bad field", () => {
  assertEquals(json('{"a":1}', "artifact"), { a: 1 });
  assertEquals(json({ a: 1 }, "artifact"), { a: 1 });
  try {
    json("{oops", "artifact");
    throw new Error("expected a throw");
  } catch (err) {
    assert(String(err).includes("`artifact`"), String(err));
  }
});

/**
 * The numbers are not contiguous — there is no 4 through 9 — so a workflow
 * comparing against one it invented waits forever.
 */
Deno.test("runStatusName: names every documented status and reports an unknown one", () => {
  assertEquals(runStatusName(1), "Queued");
  assertEquals(runStatusName(3), "Running");
  assertEquals(runStatusName(10), "Success");
  assertEquals(runStatusName(20), "Error");
  assertEquals(runStatusName(30), "Cancelled");
  assertEquals(runStatusName(4), "status 4");
});

/** dbt's settings page shows the URL with a path on it; pasting that must work. */
Deno.test("normalizeAccessUrl: strips paths, adds https, defaults to the legacy host", () => {
  assertEquals(normalizeAccessUrl("ab123.us1.dbt.com"), "https://ab123.us1.dbt.com");
  assertEquals(
    normalizeAccessUrl("https://ab123.us1.dbt.com/deploy/42/"),
    "https://ab123.us1.dbt.com",
  );
  assertEquals(normalizeAccessUrl(""), DEFAULT_ACCESS_URL);
  assertEquals(normalizeAccessUrl(undefined), DEFAULT_ACCESS_URL);
});

Deno.test("normalizeAccessUrl: refuses something that is not a URL", () => {
  assertRejects(async () => await Promise.reject(new Error("x")), Error);
  try {
    normalizeAccessUrl("not a url at all");
    throw new Error("expected a throw");
  } catch (err) {
    assert(/not a valid URL/.test(String(err)), String(err));
  }
});

Deno.test("accessUrlFromConnection: reads the connection, falling back to the legacy host", () => {
  assertEquals(accessUrlFromConnection(undefined), DEFAULT_ACCESS_URL);
  assertEquals(
    accessUrlFromConnection({ display } as never),
    "https://ab123.us1.dbt.com",
  );
});

/** A wrong account id gives a 404 that reads like a missing job, so this is explicit. */
Deno.test("accountIdFromConnection: refuses with an actionable message when unset", () => {
  try {
    accountIdFromConnection({ display: {} } as never);
    throw new Error("expected a throw");
  } catch (err) {
    assert(/reconnect/.test(String(err)), String(err));
  }
});

Deno.test("client: builds the URL from the connection's access url and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { id: 7 }, status: { code: 200 } },
  }], {
    display,
  });
  assertEquals(await new DbtCloudClient(ctx).request("/api/v2/accounts/42/runs/7/"), { id: 7 });
  assertEquals(calls[0].url, "https://ab123.us1.dbt.com/api/v2/accounts/42/runs/7/");
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** dbt takes `__in` filters as one comma-separated value, not repeated keys. */
Deno.test("client: an array query value is joined, not repeated", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], { display });
  await new DbtCloudClient(ctx).request("/api/v2/accounts/42/runs/", {
    query: { status__in: [1, 2, 3] },
  });
  assertEquals(new URL(calls[0].url).searchParams.getAll("status__in"), ["1,2,3"]);
});

Deno.test("client: raw mode returns the text untouched, for artifacts", async () => {
  const { ctx } = mockCtx([{ status: 200, body: '{"results":[]}' }], { display });
  const text = await new DbtCloudClient(ctx).request<string>("/x", { raw: true });
  assertEquals(text, '{"results":[]}');
});

/** `user_message` is written for a person and is the half worth surfacing. */
Deno.test("client: an error surfaces dbt's own user_message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: { user_message: "Not found.", developer_message: null }, data: null },
  }], { display });
  await assertRejects(
    async () => await new DbtCloudClient(ctx).request("/api/v2/accounts/42/jobs/9/"),
    Error,
    "dbt Cloud 404 for GET /api/v2/accounts/42/jobs/9/: Not found.",
  );
});

/**
 * A token presented to the wrong cell is unknown there and answers 401 exactly
 * like a bad token, so the message names both causes.
 */
Deno.test("describeError: a 401 names the region as a possible cause", () => {
  const out = describeError(401, JSON.stringify({ status: { user_message: "Invalid token." } }));
  assert(/region/.test(out), out);
  assert(/Invalid token/.test(out), out);
});

/** The five-minute cooldown is the part that makes a tight retry loop worse. */
Deno.test("describeError: a 429 reports the retry header and the cooldown", () => {
  const headers = new Headers({ "retry-after": "300" });
  const out = describeError(
    429,
    JSON.stringify({ status: { user_message: "Slow down." } }),
    headers,
  );
  assert(/retry after 300s/.test(out), out);
  assert(/five-minute cooldown/.test(out), out);
});

Deno.test("describeError: a non-JSON body still reads", () => {
  assertEquals(describeError(502, "<html>bad gateway</html>"), "<html>bad gateway</html>");
});

/** There is no cursor and no has-more flag — a short page is the end. */
Deno.test("client: requestAll pages on offset and stops on a short page", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ i }));
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: full, extra: { pagination: { count: 100, total_count: 150 } } } },
    {
      status: 200,
      body: { data: [{ i: 100 }], extra: { pagination: { count: 1, total_count: 150 } } },
    },
  ], { display });
  const { items, totalCount } = await new DbtCloudClient(ctx).requestAll(
    "/api/v2/accounts/42/runs/",
  );
  assertEquals(items.length, 101);
  assertEquals(totalCount, 150);
  assertEquals(new URL(calls[0].url).searchParams.get("offset"), "0");
  assertEquals(new URL(calls[1].url).searchParams.get("offset"), "100");
});

Deno.test("client: requestAll never asks for more than dbt's page cap of 100", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], { display });
  await new DbtCloudClient(ctx).requestAll("/api/v2/accounts/42/runs/", {}, 500);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "100");
});

Deno.test("client: requestAll stops once total_count is reached", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ i }));
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: full, extra: { pagination: { count: 100, total_count: 100 } } } },
  ], { display });
  const { items } = await new DbtCloudClient(ctx).requestAll("/api/v2/accounts/42/runs/");
  assertEquals(items.length, 100);
  assertEquals(calls.length, 1);
});
