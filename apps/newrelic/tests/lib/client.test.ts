import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  accountFromConnection,
  accountId,
  compact,
  csv,
  describeErrors,
  endpointFor,
  json,
  mutationErrors,
  NewRelicClient,
  regionFromConnection,
  REGIONS,
} from "../../lib/client.ts";

const display = { region: "US", accountId: 12345 };

Deno.test("endpointFor: US and EU are separate endpoints", () => {
  assertEquals(endpointFor("US"), REGIONS.US);
  assertEquals(endpointFor("eu"), REGIONS.EU);
  assertEquals(endpointFor(undefined), REGIONS.US);
  assertThrows(() => endpointFor("APAC"), Error, "US and EU");
});

Deno.test("regionFromConnection reads the connection, defaulting to US", () => {
  assertEquals(regionFromConnection({ display } as never), "US");
  assertEquals(regionFromConnection({ display: { region: "EU" } } as never), "EU");
  assertEquals(regionFromConnection(undefined), "US");
});

/** A user key sees several accounts, so the id is not implied by the credential. */
Deno.test("accountId: the param wins, then the connection, then an explanatory error", () => {
  assertEquals(accountId(999, { display } as never), 999);
  assertEquals(accountId("", { display } as never), 12345);
  assertEquals(accountFromConnection({ display } as never), 12345);
  const error = assertThrows(() => accountId(undefined, { display: {} } as never), Error);
  assert(/several accounts/.test(error.message), error.message);
  assert(/account-list/.test(error.message), error.message);
});

Deno.test("compact, csv and json behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [], e: false }), { a: 1, e: false });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
});

Deno.test("gql: posts the query and variables to the connection's region", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { ok: true } } }], { display });
  await new NewRelicClient(ctx).gql("{ actor { user { name } } }", { a: 1 });
  assertEquals(calls[0].url, REGIONS.US);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    query: "{ actor { user { name } } }",
    variables: { a: 1 },
  });
});

Deno.test("gql: an EU connection goes to the EU endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }], {
    display: { region: "EU" },
  });
  await new NewRelicClient(ctx).gql("{ actor { user { name } } }");
  assertEquals(calls[0].url, REGIONS.EU);
});

/** The auth hook signs; the client must never carry a key itself. */
Deno.test("gql: never sets an api-key header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }], { display });
  await new NewRelicClient(ctx).gql("{ actor { user { name } } }");
  assertEquals(calls[0].headers["api-key"], undefined);
});

/** Level 1: HTTP, which only auth failures actually use. */
Deno.test("gql: a 401 throws with the explanation of all three causes", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errors: [{ message: "authentication required" }] },
  }], { display });
  let message = "";
  try {
    await new NewRelicClient(ctx).gql("{ actor { user { name } } }");
  } catch (err) {
    message = String(err);
  }
  assert(/three different problems/.test(message), message);
  assert(/License or Ingest key/.test(message), message);
  assert(/other region/.test(message), message);
});

/**
 * Level 2: the GraphQL errors array, which arrives inside a 200 — the trap
 * GraphQL makes structural.
 */
Deno.test("gql: errors inside a 200 throw rather than reading as success", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { errors: [{ message: "NRQL Syntax Error", path: ["actor", "account", "nrql"] }] },
  }], { display });
  let message = "";
  try {
    await new NewRelicClient(ctx).gql("{ actor { user { name } } }");
  } catch (err) {
    message = String(err);
  }
  assert(/NRQL Syntax Error/.test(message), message);
  assert(/actor.account.nrql/.test(message), "the path is not reported");
});

/** GraphQL permits data AND errors together, which reads as a clean result. */
Deno.test("gql: a partial success is named as one, not silently returned", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      data: { actor: { user: { name: "a" } } },
      errors: [{ message: "not authorized", path: ["actor", "accounts"] }],
    },
  }], { display });
  let message = "";
  try {
    await new NewRelicClient(ctx).gql("{ actor { user { name } accounts { id } } }");
  } catch (err) {
    message = String(err);
  }
  assert(/PARTIAL success/.test(message), message);
  assert(/incomplete rather than wrong/.test(message), message);
});

Deno.test("gql: a body with neither data nor errors is an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }], { display });
  let message = "";
  try {
    await new NewRelicClient(ctx).gql("{ actor { user { name } } }");
  } catch (err) {
    message = String(err);
  }
  assert(/neither data nor errors/.test(message), message);
});

Deno.test("gql: a non-JSON body fails loudly", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }], { display });
  let message = "";
  try {
    await new NewRelicClient(ctx).gql("{ actor { user { name } } }");
  } catch (err) {
    message = String(err);
  }
  assert(/did not return JSON/.test(message), message);
});

Deno.test("describeErrors: an error class is included when there is one", () => {
  const message = describeErrors(
    [{ message: "boom", extensions: { errorClass: "VALIDATION_ERROR" } }],
    false,
  );
  assert(/\[VALIDATION_ERROR\]/.test(message), message);
});

/**
 * Level 3: a mutation's own errors, inside `data`, with no GraphQL error and
 * no HTTP status to notice.
 */
Deno.test("mutationErrors: a mutation payload's errors throw, and say where they came from", () => {
  mutationErrors({ errors: [] }, "op");
  mutationErrors(undefined, "op");
  const error = assertThrows(
    () => mutationErrors({ errors: [{ message: "no such entity", type: "NOT_FOUND" }] }, "tagAdd"),
    Error,
  );
  assert(/tagAdd failed/.test(error.message), error.message);
  assert(/NOT_FOUND: no such entity/.test(error.message), error.message);
  assert(/HTTP 200 with no GraphQL errors/.test(error.message), error.message);
});
