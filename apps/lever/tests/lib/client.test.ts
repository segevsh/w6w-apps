import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API,
  assertPerformAs,
  assertUuid,
  compact,
  CONFIDENTIALITY,
  csv,
  dataCenterFromConnection,
  describeError,
  hostFromConnection,
  isAnonymized,
  LeverClient,
  query,
  SANDBOX_API,
} from "../../lib/client.ts";

const UUID = "8d49b010-cc6a-4f40-ace5-e86061c677ed";
const D = { display: { environment: "production", dataCenter: "global" } };

Deno.test("request: builds the v1 path and never sets the key", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], D);
  await new LeverClient(ctx).list("/opportunities");
  assertEquals(calls[0].url, `${API}/opportunities`);
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** The sandbox is a separate account with its own data. */
Deno.test("hostFromConnection: the sandbox is its own host", () => {
  assertEquals(hostFromConnection(D), API);
  assertEquals(hostFromConnection({ display: { environment: "sandbox" } }), SANDBOX_API);
  assertEquals(hostFromConnection(undefined), API);
});

Deno.test("dataCenterFromConnection: defaults to global", () => {
  assertEquals(dataCenterFromConnection(D), "global");
  assertEquals(dataCenterFromConnection({ display: { dataCenter: "eu" } }), "eu");
  assertEquals(dataCenterFromConnection(undefined), "global");
});

/** Lever returns an opaque cursor it calls an offset. */
Deno.test("list: unwraps data, next and hasNext", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: [{ id: "a" }], next: "0.14148.abc", hasNext: true },
  }], D);
  const page = await new LeverClient(ctx).list<{ id: string }>("/opportunities");
  assertEquals(page.data.length, 1);
  assertEquals(page.next, "0.14148.abc");
  assertEquals(page.hasNext, true);
});

Deno.test("one: unwraps the single-resource envelope", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: { id: "a" } } }], D);
  assertEquals(await new LeverClient(ctx).one("/opportunities/a"), { id: "a" });
});

/** Lever answers a malformed id with a 404 naming the resource. */
Deno.test("assertUuid: refuses a non-UUID with the reason the 404 misleads", () => {
  assertEquals(assertUuid(UUID.toUpperCase(), "opportunityId"), UUID);
  const err = assertThrows(() => assertUuid("12345", "opportunityId"), Error);
  assert(/reads as a missing record/.test(err.message), err.message);
  assertThrows(() => assertUuid("", "opportunityId"), Error, "required");
});

/** Every write is attributed to a person. */
Deno.test("assertPerformAs: explains what the id is and where it comes from", () => {
  assertEquals(assertPerformAs(UUID), UUID);
  const err = assertThrows(() => assertPerformAs(""), Error);
  assert(/attributes every write to a user/.test(err.message), err.message);
  assert(/`user-list` reports/.test(err.message), err.message);
  assertThrows(() => assertPerformAs("not-a-uuid"), Error, "must be a UUID");
});

Deno.test("isAnonymized: reads the flag a data-protection request sets", () => {
  assertEquals(isAnonymized({ isAnonymized: true }), true);
  assertEquals(isAnonymized({ name: "Ada" }), false);
  assertEquals(isAnonymized(undefined), false);
});

Deno.test("compact, csv and query behave as the actions assume", () => {
  assertEquals(CONFIDENTIALITY.all, "all");
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [] }), { a: 1 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(query({ a: "x", b: 2, c: "" }), { a: "x", b: 2 });
});

/** Basic auth with the key as the username. */
Deno.test("describeError: a 401 names the basic-auth shape", () => {
  const message = describeError(401, JSON.stringify({ code: "UnauthorizedError", message: "no" }));
  assert(/BASIC AUTH USERNAME/.test(message), message);
});

/** Confidential access is granted only at key creation. */
Deno.test("describeError: a 403 names the confidential grant", () => {
  const message = describeError(403, JSON.stringify({ message: "forbidden" }));
  assert(/only when a key is created/.test(message), message);
});

Deno.test("describeError: a 404 names both the malformed id and confidentiality", () => {
  const message = describeError(404, JSON.stringify({ message: "not found" }));
  assert(/malformed id/.test(message), message);
  assert(/absent rather than forbidden/.test(message), message);
});

Deno.test("describeError: a 429 says there is no budget header to read", () => {
  assert(/only strategy is exponential backoff/.test(describeError(429, "{}")));
});

Deno.test("request: an error names the method, the path and the reason", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { code: "ResourceNotFound", message: "stages abc was not found" },
  }], D);
  let message = "";
  try {
    await new LeverClient(ctx).one("/stages/abc");
  } catch (err) {
    message = String(err);
  }
  assert(/Lever 404 for GET \/v1\/stages\/abc/.test(message), message);
});
