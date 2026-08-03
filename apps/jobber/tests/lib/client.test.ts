import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_URL,
  API_VERSION,
  API_VERSION_HEADER,
  compact,
  csv,
  dateRange,
  JobberClient,
  jsonArg,
  optionalInput,
  sortInput,
  unwrap,
} from "../../lib/client.ts";

Deno.test("client: posts to the single GraphQL endpoint with the pinned version header", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { account: { id: "a" } } } }]);
  await new JobberClient(ctx).query("{ account { id } }");

  assertEquals(calls[0].url, API_URL);
  assertEquals(calls[0].url, "https://api.getjobber.com/api/graphql");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers[API_VERSION_HEADER], API_VERSION);
  assertEquals(calls[0].headers[API_VERSION_HEADER], "2025-04-16");
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("client: never sets Authorization — that is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await new JobberClient(ctx).query("{ account { id } }");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: sends query and compacted variables as a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await new JobberClient(ctx).query("query Q($a: String) { x }", {
    a: "keep",
    b: undefined,
    c: null,
    d: "",
    e: [],
    f: false,
    g: 0,
  });
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query, "query Q($a: String) { x }");
  // false and 0 are values; undefined / null / "" / [] are "unset".
  assertEquals(sent.variables, { a: "keep", f: false, g: 0 });
});

// --- the whole point of this transport ------------------------------------

Deno.test("client: HTTP 200 carrying errors[] is a FAILURE, not a success", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      errors: [{
        message:
          "The field account on an object of type Query was hidden because you are unauthenticated",
        extensions: { code: "UNAUTHENTICATED" },
      }],
      data: { account: null },
    },
  }]);

  const err = await assertRejects(
    () => new JobberClient(ctx).query("{ account { id } }"),
    Error,
  );
  assert(err.message.includes("Jobber GraphQL error"));
  assert(err.message.includes("hidden because you are unauthenticated"));
});

Deno.test("client: a 200 with errors[] never returns data, even when data is present", async () => {
  // This is the exact shape the live endpoint returns: a populated `data` key
  // sitting beside the errors. Returning it would look like success.
  const { ctx } = mockCtx([{
    status: 200,
    body: { errors: [{ message: "boom" }], data: { clients: { nodes: [] } } },
  }]);
  await assertRejects(() => new JobberClient(ctx).query("{ clients { nodes { id } } }"), Error);
});

Deno.test("client: THROTTLED is named, with the remaining budget, not reported as a generic error", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      errors: [{ message: "Throttled", extensions: { code: "THROTTLED" } }],
      extensions: {
        cost: {
          requestedQueryCost: 10001,
          actualQueryCost: 0,
          throttleStatus: { maximumAvailable: 10000, currentlyAvailable: 10000, restoreRate: 500 },
        },
      },
    },
  }]);

  const err = await assertRejects(() => new JobberClient(ctx).query("{ x }"), Error);
  assert(err.message.includes("throttled"));
  assert(err.message.includes("10000 available"));
});

Deno.test("client: several errors are all reported, not just the first", async () => {
  const { ctx } = mockCtx([{
    body: { errors: [{ message: "one" }, { message: "two" }], data: {} },
  }]);
  const err = await assertRejects(() => new JobberClient(ctx).query("{ x }"), Error);
  assert(err.message.includes("one"));
  assert(err.message.includes("two"));
});

Deno.test("client: a real HTTP failure with no errors[] still throws", async () => {
  const { ctx } = mockCtx([{ status: 429, statusText: "Too Many Requests", body: { data: null } }]);
  const err = await assertRejects(() => new JobberClient(ctx).query("{ x }"), Error);
  assert(err.message.includes("429"));
});

Deno.test("client: a non-JSON body throws rather than crashing on parse", async () => {
  const { ctx } = mockCtx([{
    status: 502,
    statusText: "Bad Gateway",
    body: "<html>cloudflare</html>",
    headers: { "content-type": "text/html" },
  }]);
  const err = await assertRejects(() => new JobberClient(ctx).query("{ x }"), Error);
  assert(err.message.includes("non-JSON response"));
});

Deno.test("client: a 200 with neither data nor errors is not a success", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  await assertRejects(() => new JobberClient(ctx).query("{ x }"), Error, "no data");
});

Deno.test("client: a version end-of-support warning is logged, not swallowed or thrown", async () => {
  const { ctx, logs } = mockCtx([{
    body: {
      data: { account: { id: "a" } },
      extensions: {
        versioning: {
          version: "2025-04-16",
          warning: "Support for API version 2025-04-16 is scheduled to stop on ...",
        },
      },
    },
  }]);
  const data = await new JobberClient(ctx).query("{ account { id } }");
  assertEquals(data, { account: { id: "a" } });
  assertEquals(logs.length, 1);
  assertEquals(logs[0].level, "warn");
  assert(logs[0].message.includes("Support for API version"));
});

Deno.test("client: send() hands back the envelope so extensions survive", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: { account: { id: "a" } },
      extensions: { cost: { actualQueryCost: 2 } },
    },
  }]);
  const payload = await new JobberClient(ctx).send("{ account { id } }");
  assertEquals(payload.extensions?.cost?.actualQueryCost, 2);
});

// --- the third failure channel --------------------------------------------

Deno.test("unwrap: userErrors at HTTP 200 with no errors[] is a failure", () => {
  const data = {
    clientCreate: {
      client: null,
      userErrors: [{ message: "First name can't be blank", path: ["input", "firstName"] }],
    },
  };
  let threw = false;
  try {
    unwrap(data, "clientCreate");
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes("Jobber rejected clientCreate"));
    assert((e as Error).message.includes("input.firstName: First name can't be blank"));
  }
  assert(threw, "a populated userErrors array must throw");
});

Deno.test("unwrap: an empty userErrors array is a success and returns the payload", () => {
  const payload = unwrap(
    { clientCreate: { client: { id: "c1" }, userErrors: [] } },
    "clientCreate",
  );
  assertEquals(payload, { client: { id: "c1" }, userErrors: [] });
});

Deno.test("unwrap: a missing payload throws rather than returning undefined", () => {
  let threw = false;
  try {
    unwrap({}, "clientCreate");
  } catch {
    threw = true;
  }
  assert(threw);
});

Deno.test("unwrap: a userError without a path still reports its message", () => {
  let msg = "";
  try {
    unwrap(
      { quoteApprove: { quote: null, userErrors: [{ message: "not approvable" }] } },
      "quoteApprove",
    );
  } catch (e) {
    msg = (e as Error).message;
  }
  assert(msg.includes("not approvable"));
  assert(!msg.includes("undefined"));
});

// --- helpers ---------------------------------------------------------------

Deno.test("compact: drops unset values but keeps false and zero", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: [], f: {}, g: false, h: 0 }), {
    a: 1,
    g: false,
    h: 0,
  });
});

Deno.test("optionalInput: an all-unset filter becomes undefined, not an empty object", () => {
  assertEquals(optionalInput({ a: undefined, b: null }), undefined);
  assertEquals(optionalInput({ a: undefined, b: "x" }), { b: "x" });
});

Deno.test("csv: splits, trims, and returns undefined for nothing", () => {
  assertEquals(csv("a, b ,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
  assertEquals(csv(" , "), undefined);
});

Deno.test("dateRange: maps to Jobber's after/before, or drops out entirely", () => {
  assertEquals(dateRange("2026-01-01", "2026-02-01"), {
    after: "2026-01-01",
    before: "2026-02-01",
  });
  assertEquals(dateRange("2026-01-01", undefined), { after: "2026-01-01" });
  assertEquals(dateRange(undefined, undefined), undefined);
});

Deno.test("sortInput: needs a key, and defaults an unknown direction to DESCENDING", () => {
  assertEquals(sortInput(undefined, "ASCENDING"), undefined);
  assertEquals(sortInput("CREATED_AT", "ASCENDING"), {
    key: "CREATED_AT",
    direction: "ASCENDING",
  });
  assertEquals(sortInput("CREATED_AT", undefined), {
    key: "CREATED_AT",
    direction: "DESCENDING",
  });
});

Deno.test("jsonArg: parses an object, passes one through, and names the field on failure", () => {
  assertEquals(jsonArg('{"a":1}', "variables"), { a: 1 });
  assertEquals(jsonArg({ a: 1 }, "variables"), { a: 1 });
  assertEquals(jsonArg("", "variables"), undefined);
  let msg = "";
  try {
    jsonArg("[1,2]", "variables");
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg, "variables must be a JSON object");
});
