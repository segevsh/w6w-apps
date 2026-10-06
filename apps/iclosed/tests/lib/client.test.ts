import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_URL,
  asOptionalJson,
  compact,
  flag,
  formatIClosedError,
  IClosedClient,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: base is the one https host under /v1", () => {
  assertEquals(API_URL, "https://public.api.iclosed.io/v1");
});

Deno.test("client: unset query values are dropped, zero and false-strings are kept", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new IClosedClient(ctx).json("/contacts", {
    query: { page: 0, limit: undefined, search: "", q: null, x: "false" },
  });
  assertEquals(new URL(calls[0].url).search, "?page=0&x=false");
});

Deno.test("client: an empty body becomes undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await new IClosedClient(ctx).json("/x"), undefined);
});

Deno.test("client: flag keeps false", () => {
  assertEquals(flag(false), "false");
  assertEquals(flag(true), "true");
  assertEquals(flag(undefined), undefined);
});

Deno.test("client: compact drops unset values only", () => {
  assertEquals(compact({ a: 0, b: false, c: "", d: null, e: undefined, f: "x" }), {
    a: 0,
    b: false,
    f: "x",
  });
});

Deno.test("client: asOptionalJson parses strings and rejects bad JSON", () => {
  assertEquals(asOptionalJson('["a"]', "answer"), ["a"]);
  assertEquals(asOptionalJson([1], "answer"), [1]);
  assertEquals(asOptionalJson("", "answer"), undefined);
  try {
    asOptionalJson("{nope", "Answer");
    throw new Error("should have thrown");
  } catch (e) {
    assertEquals((e as Error).message, "Answer is not valid JSON");
  }
});

Deno.test("error: a 400 validation body keeps the field names", async () => {
  const body = {
    message: {
      status: 400,
      details: {
        formErrors: [],
        fieldErrors: { email: ["Invalid email format"], phoneNumber: ["Must be E.164 format"] },
      },
      endpoint: "/v1/contacts",
      method: "POST",
    },
  };
  const { ctx } = mockCtx([{ status: 400, body }]);
  const err =
    (await assertRejects(() =>
      new IClosedClient(ctx).json("/contacts", { method: "POST", body: {} })
    )) as Error;
  assert(err.message.includes("400 for POST /v1/contacts"));
  assert(err.message.includes("email: Invalid email format"));
  assert(err.message.includes("phoneNumber: Must be E.164 format"));
});

Deno.test("error: a 401 keeps message and code", () => {
  const msg = formatIClosedError(
    401,
    "GET",
    "/v1/users",
    '{"message":"API key is required","code":"MISSING_API_KEY"}',
  );
  assert(msg.includes("API key is required") && msg.includes("MISSING_API_KEY"));
});

Deno.test("error: a 429 states the retry delay and the limit", () => {
  const msg = formatIClosedError(
    429,
    "GET",
    "/v1/contacts",
    JSON.stringify({
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later.",
      retryAfter: 3,
      limit: { points: 20, windowSec: 1 },
    }),
  );
  assert(msg.includes("retry after 3s"));
  assert(msg.includes("limit 20 per 1s"));
});

Deno.test("error: a non-JSON body is kept verbatim and truncated", () => {
  const msg = formatIClosedError(502, "GET", "/v1/x", "<html>" + "a".repeat(2000));
  assert(msg.startsWith("iClosed 502 for GET /v1/x: <html>"));
  assert(msg.includes("truncated"));
});
