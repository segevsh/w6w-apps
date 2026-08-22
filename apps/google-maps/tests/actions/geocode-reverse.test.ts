import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { legacy } from "./_shared.ts";
import action from "../../actions/geocode-reverse.ts";

const stack = legacy({
  status: "OK",
  results: [
    { formatted_address: "277 Bedford Ave, Brooklyn", place_id: "a", types: ["street_address"] },
    { formatted_address: "Brooklyn, NY", place_id: "b", types: ["sublocality"] },
    { formatted_address: "New York, NY", place_id: "c", types: ["locality"] },
    { formatted_address: "United States", place_id: "d", types: ["country"] },
  ],
});

/**
 * A point sits inside a street, a city, a county and a country, and reverse
 * geocoding returns all of them.
 */
Deno.test("geocode-reverse: returns the whole containing stack, most specific first", async () => {
  const { ctx, calls } = mockCtx([stack]);
  const result = await action.execute!({ location: "40.714,-73.961" }, ctx) as {
    count: number;
    types: string[];
    formattedAddress: string;
  };
  assertEquals(new URL(calls[0].url).searchParams.get("latlng"), "40.714,-73.961");
  assertEquals(result.count, 4);
  assertEquals(result.types, ["street_address"]);
  assertEquals(result.formattedAddress, "277 Bedford Ave, Brooklyn");
});

/** Wanting the postcode and reading results[0] stores a street address instead. */
Deno.test("geocode-reverse: resultType asks for one level rather than picking after", async () => {
  const { ctx, calls } = mockCtx([stack]);
  await action.execute!({ location: "40.714,-73.961", resultType: "postal_code" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("result_type"), "postal_code");
});

Deno.test("geocode-reverse: locationType filters by precision", async () => {
  const { ctx, calls } = mockCtx([stack]);
  await action.execute!({ location: "1,2", locationType: "ROOFTOP" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("location_type"), "ROOFTOP");
});

Deno.test("geocode-reverse: a point over the sea is found:false, not an error", async () => {
  const { ctx } = mockCtx([legacy({ status: "ZERO_RESULTS", results: [] })]);
  const result = await action.execute!({ location: "0,0" }, ctx) as { found: boolean };
  assertEquals(result.found, false);
});

/** Swapped coordinates return a real address somewhere else entirely. */
Deno.test("geocode-reverse: a swapped pair is caught before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ location: "-122.08,37.42" }, ctx),
    Error,
    "LATITUDE FIRST",
  );
  assertEquals(calls.length, 0);
});

Deno.test("geocode-reverse: logs the level, never the address", async () => {
  const { ctx, logs } = mockCtx([stack]);
  await action.execute!({ location: "40.714,-73.961" }, ctx);
  assert(!JSON.stringify(logs).includes("Bedford"), JSON.stringify(logs));
  assertEquals(logs[0].data, { levels: 4, types: ["street_address"] });
});

Deno.test("geocode-reverse: needs a location", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`location` is required");
});
