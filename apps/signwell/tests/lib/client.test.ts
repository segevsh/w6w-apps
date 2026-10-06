import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_BASE,
  asJson,
  asJsonOptional,
  compact,
  errorCode,
  formatSignWellError,
  isErrorEnvelope,
  requireId,
  SignWellClient,
} from "../../lib/client.ts";
import { bodyFromParams } from "../../lib/params.ts";

Deno.test("client: base is the one documented host under /api/v1", () => {
  assertEquals(API_BASE, "https://www.signwell.com/api/v1");
});

Deno.test("client: request sends json, never an auth header, and drops unset query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await new SignWellClient(ctx).request("/x", {
    method: "POST",
    query: { a: 1, b: undefined, c: "", d: false },
    body: { z: 1 },
  });
  assertEquals(out, { ok: true });
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/x?a=1&d=false");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].body, '{"z":1}');
});

Deno.test("client: an empty 204 body resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new SignWellClient(ctx).request("/x", { method: "DELETE" }), undefined);
});

Deno.test("client: the three documented error shapes are each read from the body", () => {
  const meta = JSON.stringify({
    message: "Not found",
    meta: { error: "record_not_found", message: "gone" },
  });
  assertEquals(
    formatSignWellError(404, "GET", "/documents/1", meta),
    "SignWell 404 for GET /documents/1: record_not_found — gone",
  );
  const errors = JSON.stringify({ errors: { recipients: ["can't be blank"] } });
  assert(formatSignWellError(422, "POST", "/documents", errors).includes("can't be blank"));
  const limited = JSON.stringify({ error: "Rate limit exceeded: 50 per 10s" });
  assertEquals(
    formatSignWellError(429, "GET", "/me", limited),
    "SignWell 429 for GET /me: Rate limit exceeded: 50 per 10s",
  );
  assertEquals(formatSignWellError(500, "GET", "/me", "boom"), "SignWell 500 for GET /me: boom");
  assertEquals(formatSignWellError(500, "GET", "/me", "x".repeat(700)).length < 700, true);
});

Deno.test("client: errorCode and isErrorEnvelope classify from the body", () => {
  assertEquals(
    errorCode({ meta: { error: "api_key_unauthorized_error" } }),
    "api_key_unauthorized_error",
  );
  assertEquals(errorCode({ meta: {} }), undefined);
  assertEquals(errorCode(null), undefined);
  assertEquals(isErrorEnvelope({ error: "limit" }), true);
  assertEquals(isErrorEnvelope({ errors: {} }), true);
  assertEquals(isErrorEnvelope({ hello: 1 }), false);
  assertEquals(isErrorEnvelope([]), false);
  assertEquals(isErrorEnvelope("x"), false);
});

Deno.test("client: json helpers accept text or live values and reject bad text", () => {
  assertEquals(asJson('{"a":1}', "f"), { a: 1 });
  assertEquals(asJson([1], "f"), [1]);
  assertEquals(asJsonOptional(undefined, "f"), undefined);
  assertEquals(asJsonOptional("", "f"), undefined);
  assertEquals(asJsonOptional("[1]", "f"), [1]);
  assertThrows(() => asJson("{", "f"), Error, "`f` is not valid JSON");
  assertThrows(() => asJson(undefined, "f"), Error, "`f` is required");
  assertEquals(compact({ a: 0, b: false, c: "", d: undefined, e: null, f: "x" }), {
    a: 0,
    b: false,
    f: "x",
  });
  assertEquals(requireId(" abc "), "abc");
  assertThrows(() => requireId(undefined), Error, "`id` is required");
});

Deno.test("params: bodyFromParams parses json, coerces numbers, keeps false and 0, drops unset", () => {
  const body = bodyFromParams(
    { a: "[1]", n: "5", z: 0, f: false, s: "", u: undefined, extra: "ignored" },
    [
      { key: "a", label: "a", type: "json" },
      { key: "n", label: "n", type: "number" },
      { key: "z", label: "z", type: "number" },
      { key: "f", label: "f", type: "boolean" },
      { key: "s", label: "s", type: "string" },
      { key: "u", label: "u", type: "string" },
    ],
  );
  assertEquals(body, { a: [1], n: 5, z: 0, f: false });
});
