import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_HOST,
  byteLength,
  compact,
  csv,
  describeError,
  deviceId,
  json,
  MAX_EVENT_DATA_BYTES,
  MAX_EVENT_NAME_BYTES,
  MAX_FUNCTION_ARG_BYTES,
  ParticleClient,
  query,
} from "../../lib/client.ts";

const ID = "0123456789abcdef01234567";

Deno.test("the API host and the documented limits", () => {
  assertEquals(API_HOST, "https://api.particle.io");
  assertEquals(MAX_FUNCTION_ARG_BYTES, 1024);
  assertEquals(MAX_EVENT_NAME_BYTES, 64);
  assertEquals(MAX_EVENT_DATA_BYTES, 1024);
});

/** A name works on some paths and not others; where it does not, it 404s. */
Deno.test("deviceId: requires 24 hex characters and says why", () => {
  assertEquals(deviceId(ID), ID);
  assertEquals(deviceId(ID.toUpperCase()), ID);
  const err = assertThrows(() => deviceId("my-sensor"), Error);
  assert(/24-character hexadecimal device id/.test(err.message), err.message);
  assert(/looks like a deleted device/.test(err.message), err.message);
  assertThrows(() => deviceId(""), Error, "required");
});

/** Every Particle limit is in bytes of UTF-8, not characters. */
Deno.test("byteLength: counts bytes, not characters", () => {
  assertEquals(byteLength("abcd"), 4);
  assertEquals(byteLength("aaé"), 4, "three characters, four bytes");
  assertEquals(byteLength("🙂"), 4, "one character, four bytes");
});

/** Most of this API predates JSON bodies. */
Deno.test("request: sends form encoding when given a form", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { ok: true } }]);
  await new ParticleClient(ctx).request("/v1/devices/x/fn", {
    method: "POST",
    form: { arg: "on", ttl: 60 },
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "arg=on&ttl=60");
});

Deno.test("request: an undefined form value is omitted rather than sent as the string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new ParticleClient(ctx).request("/v1/devices/x", {
    method: "PUT",
    form: { name: "sensor", notes: undefined },
  });
  assertEquals(calls[0].body, "name=sensor");
});

/** The auth hook signs; the client must never carry a token. */
Deno.test("request: never sets an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await new ParticleClient(ctx).request("/v1/devices");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].url, "https://api.particle.io/v1/devices");
});

Deno.test("compact, csv, json and query behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined }), { a: 1 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
  assertEquals(query({ a: "x", b: 2, c: "" }), { a: "x", b: 2 });
});

/**
 * Measured: no token at all is a 400 about the request, and a bad token is a
 * 401 — the opposite of where anyone would look.
 */
Deno.test("describeError: a 400 invalid_request is explained as a MISSING credential", () => {
  const message = describeError(
    400,
    JSON.stringify({
      error: "invalid_request",
      error_description: "The access token was not found",
    }),
  );
  assert(/MISSING credential rather than a malformed request/.test(message), message);
  assert(/401 only when one is supplied and rejected/.test(message), message);
});

/** A token created without a lifetime lasts 90 days. */
Deno.test("describeError: a 401 names token expiry", () => {
  const message = describeError(401, JSON.stringify({ error: "invalid_token" }));
  assert(/lasts 90 days/.test(message), message);
  assert(/worked for months can stop for this reason alone/.test(message), message);
});

Deno.test("describeError: a 403 is about ownership, not the token being wrong", () => {
  const message = describeError(403, "{}");
  assert(/does not own this device/.test(message), message);
});

/** A device timing out is the hardware, not the API. */
Deno.test("describeError: a timeout is attributed to the device", () => {
  const message = describeError(408, JSON.stringify({ error: "Timed out." }));
  assert(/the DEVICE did not answer in time/.test(message), message);
  assert(/working exactly as designed/.test(message), message);

  // The same explanation when the status is not 408 but the body says so.
  const byBody = describeError(400, JSON.stringify({ error: "Timed out." }));
  assert(/did not answer in time/.test(byBody), byBody);
});

Deno.test("describeError: 404, 429 and 5xx each explain themselves", () => {
  assert(/24 hex characters/.test(describeError(404, "{}")));
  assert(/publishes no headers/.test(describeError(429, "{}")));
  assert(/the cloud rather than the hardware/.test(describeError(500, "{}")));
});

Deno.test("request: an error names the method, the path and the explanation", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "forbidden" } }]);
  let message = "";
  try {
    await new ParticleClient(ctx).request(`/v1/devices/${ID}/unlock`, { method: "POST" });
  } catch (err) {
    message = String(err);
  }
  assert(/403/.test(message), message);
  assert(new RegExp(`POST /v1/devices/${ID}/unlock`).test(message), message);
  assert(/does not own this device/.test(message), message);
});
