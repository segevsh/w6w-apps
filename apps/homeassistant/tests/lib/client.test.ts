import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  csv,
  describeError,
  domainOf,
  entityId,
  HomeAssistantClient,
  isUsable,
  json,
  normalizeUrl,
  NOT_WORKING,
  query,
  urlFromConnection,
} from "../../lib/client.ts";

const display = { url: "http://homeassistant.local:8123" };

Deno.test("normalizeUrl: fills in a scheme and keeps the port and any path prefix", () => {
  assertEquals(normalizeUrl("homeassistant.local:8123"), "http://homeassistant.local:8123");
  assertEquals(normalizeUrl("https://abc.ui.nabu.casa"), "https://abc.ui.nabu.casa");
  assertEquals(normalizeUrl("https://example.com/ha/"), "https://example.com/ha");
  assertThrows(() => normalizeUrl(""), Error, "required");
  assertThrows(() => normalizeUrl("not a url"), Error);
});

/** Guessing :8123 would break every tunnelled instance, which is reached on 443. */
Deno.test("normalizeUrl: a URL with no port is left alone rather than assuming 8123", () => {
  assertEquals(normalizeUrl("https://ha.example.com"), "https://ha.example.com");
});

Deno.test("urlFromConnection: a connection without a URL says to reconnect", () => {
  assertEquals(urlFromConnection({ display } as never), "http://homeassistant.local:8123");
  const error = assertThrows(() => urlFromConnection({ display: {} } as never), Error);
  assert(/reconnect it/.test(error.message), error.message);
});

/**
 * The mistake people make is passing the friendly name, and a 404 does not
 * suggest that at all.
 */
Deno.test("entityId: a friendly name is refused, with where to find the real id", () => {
  assertEquals(entityId("light.kitchen", "entityId"), "light.kitchen");
  const error = assertThrows(() => entityId("Kitchen Light", "entityId"), Error);
  assert(/friendly name/.test(error.message), error.message);
  assert(/Settings → Devices & services → Entities/.test(error.message), error.message);
});

Deno.test("entityId: the format is strict, and lower case", () => {
  assertThrows(() => entityId("Light.Kitchen", "entityId"), Error);
  assertThrows(() => entityId("light", "entityId"), Error);
  assertThrows(() => entityId("light.kitchen.extra", "entityId"), Error);
  assertThrows(() => entityId("", "entityId"), Error, "required");
  assertEquals(entityId("binary_sensor.front_door_motion", "x"), "binary_sensor.front_door_motion");
});

Deno.test("domainOf takes the half before the dot", () => {
  assertEquals(domainOf("light.kitchen"), "light");
});

/**
 * A dead integration reports `unavailable`, which parses to NaN and compares
 * false against everything — silently.
 */
Deno.test("isUsable separates real values from the two that are not values", () => {
  assert(isUsable("21.5"));
  assert(isUsable("on"));
  assert(!isUsable("unavailable"));
  assert(!isUsable("unknown"));
  assertEquals(NOT_WORKING.size, 2);
});

Deno.test("compact, csv, json and query behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [], e: false }), { a: 1, e: false });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
  assertEquals(query({ a: "x", b: 2, c: "" }), { a: "x", b: 2 });
});

Deno.test("request: builds the path under /api on the connection's own host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { ok: true } }], { display });
  await new HomeAssistantClient(ctx).request("/states/light.kitchen");
  assertEquals(calls[0].url, "http://homeassistant.local:8123/api/states/light.kitchen");
});

/** The auth hook signs; the client must never carry a token itself. */
Deno.test("request: never sets an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await new HomeAssistantClient(ctx).request("/config");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("request: text mode returns the body verbatim rather than parsing it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "2" }], { display });
  const result = await new HomeAssistantClient(ctx).request<string>("/template", {
    method: "POST",
    body: { template: "{{ 1 + 1 }}" },
    text: true,
  });
  assertEquals(result, "2", "the two characters, not the number");
  assertEquals(calls[0].headers["accept"], "text/plain");
});

Deno.test("request: a non-JSON body in JSON mode fails loudly", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html/>" }], { display });
  let message = "";
  try {
    await new HomeAssistantClient(ctx).request("/config");
  } catch (err) {
    message = String(err);
  }
  assert(/did not return JSON/.test(message), message);
});

Deno.test("describeError: 401 explains that tokens do not expire but are revocable", () => {
  const message = describeError(401, JSON.stringify({ message: "Unauthorized" }));
  assert(/do not expire but they are revocable/.test(message), message);
});

/** The failure that looks like a bad request and is a proxy configuration. */
Deno.test("describeError: 400 names trusted_proxies", () => {
  const message = describeError(400, "");
  assert(/trusted_proxies/.test(message), message);
  assert(/reverse proxy/.test(message), message);
});

Deno.test("describeError: 404 points at the entity id format", () => {
  const message = describeError(404, JSON.stringify({ message: "Entity not found." }));
  assert(/lower case, not the friendly name/.test(message), message);
});

Deno.test("describeError: 405 suggests the api integration is not loaded", () => {
  assert(/default_config/.test(describeError(405, "")));
});

Deno.test("describeError: a plain-text body is used as-is", () => {
  assertEquals(describeError(500, "Internal Server Error"), "Internal Server Error");
});

Deno.test("request: an error carries the method, the path and the explanation", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Entity not found." } }], { display });
  let message = "";
  try {
    await new HomeAssistantClient(ctx).request("/states/light.nope");
  } catch (err) {
    message = String(err);
  }
  assert(/404/.test(message), message);
  assert(/\/api\/states\/light.nope/.test(message), message);
  assert(/friendly name/.test(message), message);
});
