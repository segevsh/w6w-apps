import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  baseUrlFromConnection,
  compact,
  csv,
  describeError,
  hostFor,
  isoTimestamp,
  query,
  VantaClient,
} from "../../lib/client.ts";

const display = { region: "commercial" };
const page = (data: unknown[], extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    results: { data, pageInfo: { hasNextPage: false, endCursor: null, ...extra } },
  },
});

Deno.test("compact: drops unset keys so a filter is absent rather than empty", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: [], f: false }), {
    a: 1,
    f: false,
  });
});

Deno.test("query: keeps numbers, booleans and arrays; drops blanks", () => {
  assertEquals(query({ a: 1, b: false, c: "x", d: "", e: undefined, f: ["p"] }), {
    a: 1,
    b: false,
    c: "x",
    f: ["p"],
  });
});

Deno.test("csv: splits, trims and drops empties; blank means unset", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
});

Deno.test("isoTimestamp: normalises a date and refuses a non-date by field name", () => {
  assertEquals(isoTimestamp("2026-08-18T12:00:00Z", "dueBeforeDate"), "2026-08-18T12:00:00.000Z");
  assertEquals(isoTimestamp("", "dueBeforeDate"), undefined);
  try {
    isoTimestamp("next tuesday", "dueBeforeDate");
    throw new Error("expected a throw");
  } catch (err) {
    assert(String(err).includes("`dueBeforeDate`"), String(err));
  }
});

/** Vanta Gov has its own host, and a credential for one is unknown to the other. */
Deno.test("hostFor: resolves both regions and refuses an unknown one", () => {
  assertEquals(hostFor("commercial"), "https://api.vanta.com");
  assertEquals(hostFor("gov"), "https://api.vanta-gov.com");
  assertEquals(hostFor(undefined), "https://api.vanta.com");
  try {
    hostFor("eu");
    throw new Error("expected a throw");
  } catch (err) {
    assert(/FedRAMP/.test(String(err)), String(err));
  }
});

Deno.test("baseUrlFromConnection: reads the region off the connection", () => {
  assertEquals(baseUrlFromConnection(undefined), "https://api.vanta.com");
  assertEquals(
    baseUrlFromConnection({ display: { region: "gov" } } as never),
    "https://api.vanta-gov.com",
  );
});

Deno.test("client: builds the v1 URL and sets no authorization", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await new VantaClient(ctx).page("/tests");
  assertEquals(calls[0].url, "https://api.vanta.com/v1/tests");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: a gov connection calls the gov host", async () => {
  const { ctx, calls } = mockCtx([page([])], { display: { region: "gov" } });
  await new VantaClient(ctx).page("/tests");
  assertEquals(calls[0].url, "https://api.vanta-gov.com/v1/tests");
});

/** Vanta's `*MatchesAny` filters take repeated keys. */
Deno.test("client: an array query value becomes repeated keys", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await new VantaClient(ctx).page("/issues", {
    query: { statusMatchesAny: ["OPEN", "IN_PROGRESS"] },
  });
  assertEquals(new URL(calls[0].url).searchParams.getAll("statusMatchesAny"), [
    "OPEN",
    "IN_PROGRESS",
  ]);
});

Deno.test("client: page unwraps the results envelope", async () => {
  const { ctx } = mockCtx([page([{ id: "t1" }], { hasNextPage: true, endCursor: "c1" })], {
    display,
  });
  const result = await new VantaClient(ctx).page("/tests");
  assertEquals(result.items, [{ id: "t1" }]);
  assertEquals(result.hasNextPage, true);
  assertEquals(result.endCursor, "c1");
});

/**
 * Vanta's own pageSize default is 10, which on a tenant with four hundred
 * failing tests looks like a healthy tenant.
 */
Deno.test("client: pageAll always asks for 100 rather than accepting the default", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await new VantaClient(ctx).pageAll("/tests");
  assertEquals(new URL(calls[0].url).searchParams.get("pageSize"), "100");
});

Deno.test("client: pageAll follows the cursor and reports a completed walk", async () => {
  const { ctx, calls } = mockCtx([
    page([{ id: "a" }], { hasNextPage: true, endCursor: "c1" }),
    page([{ id: "b" }]),
  ], { display });
  const result = await new VantaClient(ctx).pageAll("/tests");
  assertEquals(result.items.length, 2);
  assertEquals(result.hasNextPage, false);
  assertEquals(new URL(calls[1].url).searchParams.get("pageCursor"), "c1");
});

Deno.test("client: pageAll stops at the page ceiling and says the walk truncated", async () => {
  const { ctx, calls } = mockCtx([
    page([{ id: "a" }], { hasNextPage: true, endCursor: "c1" }),
    page([{ id: "b" }], { hasNextPage: true, endCursor: "c2" }),
  ], { display });
  const result = await new VantaClient(ctx).pageAll("/tests", {}, Infinity, 2);
  assertEquals(calls.length, 2);
  assertEquals(result.hasNextPage, true);
});

Deno.test("client: pageAll trims to the requested total", async () => {
  const { ctx } = mockCtx([page([{ id: "a" }, { id: "b" }, { id: "c" }])], { display });
  const result = await new VantaClient(ctx).pageAll("/tests", {}, 2);
  assertEquals(result.items.length, 2);
});

/**
 * The most likely cause of a 401 is not a bad secret — it is something else
 * minting a token for the same application, which revokes this one.
 */
Deno.test("describeError: a 401 names the one-active-token rule", () => {
  const out = describeError(401, JSON.stringify({ message: "Unauthorized" }));
  assert(/ANOTHER PROCESS/.test(out), out);
  assert(/one active token per application/.test(out), out);
});

Deno.test("describeError: a 403 explains that scopes are chosen at token time", () => {
  assert(/requested at token time/.test(describeError(403, "{}")));
});

/** The token endpoint's limit is far tighter than the API's. */
Deno.test("describeError: a 429 names both limits", () => {
  const out = describeError(429, "{}");
  assert(/50 requests per minute/.test(out), out);
  assert(/5 per\s+minute on the token endpoint/.test(out), out);
});

Deno.test("describeError: a field-level validation error names the field", () => {
  const out = describeError(
    400,
    JSON.stringify({ message: "Invalid", errors: [{ field: "pageSize", message: "too large" }] }),
  );
  assert(out.includes("pageSize: too large"), out);
});

Deno.test("client: an error carries the method, the path and Vanta's message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Not found" } }], { display });
  await assertRejects(
    async () => await new VantaClient(ctx).request("/tests/nope"),
    Error,
    "Vanta 404 for GET /v1/tests/nope: Not found",
  );
});
