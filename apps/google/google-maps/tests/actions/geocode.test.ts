import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { legacy } from "./_shared.ts";
import action from "../../actions/geocode.ts";

const hit = legacy({
  status: "OK",
  results: [{
    formatted_address: "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
    place_id: "ChIJ2eUgeAK6j4ARbn5u_wAGqWA",
    geometry: { location: { lat: 37.4224, lng: -122.0842 }, location_type: "ROOFTOP" },
  }],
});

Deno.test("geocode: returns the best result and its precision", async () => {
  const { ctx, calls } = mockCtx([hit]);
  const result = await action.execute!({ address: "1600 Amphitheatre Parkway" }, ctx) as {
    found: boolean;
    location: { lat: number };
    locationType: string;
    placeId: string;
  };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/maps/api/geocode/json");
  assertEquals(url.searchParams.get("address"), "1600 Amphitheatre Parkway");
  assertEquals(result.found, true);
  assertEquals(result.location.lat, 37.4224);
  assertEquals(result.locationType, "ROOFTOP");
  assertEquals(result.placeId, "ChIJ2eUgeAK6j4ARbn5u_wAGqWA");
});

/**
 * An address that does not exist is a successful answer, not a failure. A
 * workflow needs to branch on it, not crash on it.
 */
Deno.test("geocode: ZERO_RESULTS is found:false, not an error", async () => {
  const { ctx } = mockCtx([legacy({ status: "ZERO_RESULTS", results: [] })]);
  const result = await action.execute!({ address: "45 Nowhere Lane" }, ctx) as { found: boolean };
  assertEquals(result.found, false);
});

/**
 * Google returns a confident-looking result for an address it guessed at. The
 * only signal is a field that is absent on a good match.
 */
Deno.test("geocode: a guessed match is surfaced as partialMatch", async () => {
  const { ctx } = mockCtx([
    legacy({
      status: "OK",
      results: [{ formatted_address: "High St, Anytown", partial_match: true, geometry: {} }],
    }),
  ]);
  const result = await action.execute!({ address: "21 Hihg Street" }, ctx) as {
    partialMatch: boolean;
  };
  assertEquals(result.partialMatch, true);
});

Deno.test("geocode: a confident match normalises partialMatch to false, not undefined", async () => {
  const { ctx } = mockCtx([hit]);
  const result = await action.execute!({ address: "x" }, ctx) as { partialMatch: boolean };
  assertEquals(result.partialMatch, false);
});

/** A refused key arrives as HTTP 200. */
Deno.test("geocode: REQUEST_DENIED throws rather than reading as no results", async () => {
  const { ctx } = mockCtx([
    legacy({ status: "REQUEST_DENIED", error_message: "The provided API key is invalid. " }),
  ]);
  await assertRejects(
    async () => await action.execute!({ address: "x" }, ctx),
    Error,
    "REQUEST_DENIED",
  );
});

Deno.test("geocode: component filters and bias reach the wire", async () => {
  const { ctx, calls } = mockCtx([hit]);
  await action.execute!({
    address: "High Street",
    components: "country:GB",
    bounds: "51.4,-0.2|51.6,-0.05",
    languageCode: "en",
    regionCode: "gb",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("components"), "country:GB");
  assertEquals(url.searchParams.get("bounds"), "51.4,-0.2|51.6,-0.05");
  assertEquals(url.searchParams.get("language"), "en");
  assertEquals(url.searchParams.get("region"), "gb");
});

/** An address is somebody's home. */
Deno.test("geocode: logs precision and counts, never the address", async () => {
  const { ctx, logs } = mockCtx([hit]);
  await action.execute!({ address: "1600 Amphitheatre Parkway" }, ctx);
  assert(!JSON.stringify(logs).includes("Amphitheatre"), JSON.stringify(logs));
  assertEquals(logs[0].data, { results: 1, locationType: "ROOFTOP", partialMatch: false });
});

Deno.test("geocode: needs an address", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`address` is required");
  assertEquals(calls.length, 0);
});
