import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  csv,
  describeLegacy,
  describeRpc,
  HOSTS,
  json,
  latLng,
  latLngPath,
  LEGACY_BASE,
  LEGACY_OK,
  MapsClient,
  pointString,
  query,
} from "../../lib/client.ts";

Deno.test("latLng: parses the form every Maps URL uses", () => {
  assertEquals(latLng("37.42,-122.08", "location"), { latitude: 37.42, longitude: -122.08 });
  assertEquals(latLng(" 51.5 , -0.12 ", "location"), { latitude: 51.5, longitude: -0.12 });
});

/**
 * Google takes latitude first, the opposite of GeoJSON. Swapped coordinates do
 * not error at Google's end — they return a real answer somewhere else.
 */
Deno.test("latLng: an out-of-range latitude is caught, and named as the swap it usually is", () => {
  const error = assertThrows(() => latLng("-122.08,37.42", "location"), Error);
  assert(/LATITUDE FIRST/.test(error.message), error.message);
  assert(/GeoJSON/.test(error.message), error.message);
});

Deno.test("latLng: an out-of-range longitude is caught too", () => {
  assertThrows(() => latLng("37.42,-1220.8", "location"), Error, "longitude");
});

Deno.test("latLng: rejects the shapes that are not a point", () => {
  assertThrows(() => latLng("", "location"), Error, "required");
  assertThrows(() => latLng("37.42", "location"), Error, '"lat,lng"');
  assertThrows(() => latLng("37.42,-122.08,9", "location"), Error, '"lat,lng"');
  assertThrows(() => latLng("here,there", "location"), Error, "two numbers");
});

Deno.test("latLngPath: splits on pipes and reports which point was bad", () => {
  assertEquals(latLngPath("1,2|3,4", "path").length, 2);
  const error = assertThrows(() => latLngPath("1,2|999,4", "path"), Error);
  assert(/path\[1\]/.test(error.message), error.message);
});

Deno.test("pointString: renders back into Google's own form", () => {
  assertEquals(pointString({ latitude: 51.5, longitude: -0.12 }), "51.5,-0.12");
});

Deno.test("compact: drops empties so a default is not overwritten with nothing", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: null, e: [], f: false }), {
    a: 1,
    f: false,
  });
});

Deno.test("csv: splits and trims, or stays unset", () => {
  assertEquals(csv("a, b ,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(["a", " b "]), ["a", "b"]);
});

Deno.test("json: parses a string param and names the field when it cannot", () => {
  assertEquals(json('{"a":1}', "filter"), { a: 1 });
  assertEquals(json("", "filter"), undefined);
  assertThrows(() => json("{oops", "filter"), Error, "`filter` is not valid JSON");
});

Deno.test("query: narrows unknowns and drops the empties", () => {
  assertEquals(query({ a: "x", b: 2, c: true, d: "", e: undefined }), { a: "x", b: 2, c: true });
});

/** `ZERO_RESULTS` is a successful answer meaning the thing does not exist. */
Deno.test("LEGACY_OK: treats ZERO_RESULTS as success", () => {
  assert(LEGACY_OK.has("OK"));
  assert(LEGACY_OK.has("ZERO_RESULTS"));
  assert(!LEGACY_OK.has("REQUEST_DENIED"));
});

/**
 * The web services answer HTTP 200 for a refused key. Reading `res.ok` sees
 * success; the outcome is only in the body.
 */
Deno.test("legacy: a REQUEST_DENIED inside a 200 throws, and explains both causes", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      results: [],
      status: "REQUEST_DENIED",
      error_message: "The provided API key is invalid. ",
    },
  }]);
  let message = "";
  try {
    await new MapsClient(ctx).legacy("/geocode/json", { address: "x" }, "Geocoding API");
  } catch (err) {
    message = String(err);
  }
  assert(/REQUEST_DENIED/.test(message), message);
  assert(/not enabled on the Cloud project/.test(message), message);
  assert(/HTTP referrers/.test(message), message);
});

/** The Time Zone API spells the message field differently from every sibling. */
Deno.test("describeLegacy: reads errorMessage as well as error_message", () => {
  assert(
    /invalid/.test(describeLegacy({ status: "REQUEST_DENIED", errorMessage: "invalid" }, "x")),
  );
  assert(/bad/.test(describeLegacy({ status: "REQUEST_DENIED", error_message: "bad" }, "x")));
});

/** A rate limit arriving as a 200 is the least visible failure in this API. */
Deno.test("describeLegacy: names OVER_QUERY_LIMIT as a rate limit in a 200", () => {
  const message = describeLegacy({ status: "OVER_QUERY_LIMIT" }, "Geocoding API");
  assert(/RATE LIMIT/.test(message), message);
  assert(/billing/.test(message), message);
});

Deno.test("legacy: OK and ZERO_RESULTS both come back rather than throwing", async () => {
  for (const status of ["OK", "ZERO_RESULTS"]) {
    const { ctx } = mockCtx([{ status: 200, body: { results: [], status } }]);
    const body = await new MapsClient(ctx).legacy<{ status?: string }>(
      "/geocode/json",
      { address: "x" },
      "Geocoding API",
    );
    assertEquals(body.status, status);
  }
});

Deno.test("legacy: builds the URL under the web-service base and drops empty params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "OK" } }]);
  await new MapsClient(ctx).legacy("/timezone/json", {
    location: "1,2",
    language: "",
    timestamp: 100,
  }, "Time Zone API");
  const url = new URL(calls[0].url);
  assertEquals(`${url.origin}${url.pathname}`, `${LEGACY_BASE}/timezone/json`);
  assertEquals(url.searchParams.get("location"), "1,2");
  assertEquals(url.searchParams.get("timestamp"), "100");
  assertEquals(url.searchParams.has("language"), false);
});

Deno.test("legacy: a body that is not JSON fails loudly rather than as an empty result", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>nope</html>" }]);
  let message = "";
  try {
    await new MapsClient(ctx).legacy("/geocode/json", {}, "Geocoding API");
  } catch (err) {
    message = String(err);
  }
  assert(/did not return JSON/.test(message), message);
});

/**
 * On the newer APIs a rejected key is a 400. Anything routing on status codes
 * reports a credential problem as the caller's mistake.
 */
Deno.test("describeRpc: a bad key is named as a credential failure despite the 400", () => {
  const body = JSON.stringify({
    error: {
      code: 400,
      status: "INVALID_ARGUMENT",
      message: "API key not valid. Please pass a valid API key.",
      details: [{ reason: "API_KEY_INVALID" }],
    },
  });
  const message = describeRpc(400, body);
  assert(/CREDENTIAL failure/.test(message), message);
  assert(/not a 401 or 403/.test(message), message);
});

Deno.test("describeRpc: a disabled API says each one is enabled separately", () => {
  const body = JSON.stringify({
    error: {
      code: 403,
      message: "Places API has not been used in project 1 before or it is disabled.",
    },
  });
  assert(/enabled separately/.test(describeRpc(403, body)));
});

Deno.test("describeRpc: a referrer-restricted key is named as unusable server-side", () => {
  const body = JSON.stringify({
    error: { code: 403, message: "Requests from referer <empty> are blocked." },
  });
  assert(/IP restriction/.test(describeRpc(403, body)));
});

Deno.test("describeRpc: a 429 is a rate limit, and says where the quota lives", () => {
  assert(/Cloud console/.test(describeRpc(429, JSON.stringify({ error: { message: "quota" } }))));
});

Deno.test("describeRpc: a non-JSON body still produces something readable", () => {
  assertEquals(describeRpc(502, "upstream boom"), "upstream boom");
  assertEquals(describeRpc(502, ""), "HTTP 502");
});

Deno.test("rpc: sends the field mask as a header and JSON as the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { places: [] } }]);
  await new MapsClient(ctx).rpc(HOSTS.places, "/v1/places:searchText", {
    method: "POST",
    body: { textQuery: "pizza" },
    fieldMask: "places.id",
  });
  assertEquals(calls[0].url, "https://places.googleapis.com/v1/places:searchText");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["x-goog-fieldmask"], "places.id");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { textQuery: "pizza" });
});

/** The auth hook appends `?key=` — no action or client may set it. */
Deno.test("rpc: never sends an api-key header of its own", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new MapsClient(ctx).rpc(HOSTS.roads, "/v1/nearestRoads", { query: { points: "1,2" } });
  assertEquals(calls[0].headers["x-goog-api-key"], undefined);
  assertEquals(new URL(calls[0].url).searchParams.get("key"), null);
});

Deno.test("rpc: an empty body reads as undefined rather than a parse error", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new MapsClient(ctx).rpc(HOSTS.places, "/v1/x"), undefined);
});
