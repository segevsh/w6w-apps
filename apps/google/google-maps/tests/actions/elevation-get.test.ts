import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { legacy } from "./_shared.ts";
import action from "../../actions/elevation-get.ts";

const points = legacy({
  status: "OK",
  results: [
    { elevation: 1608.6, resolution: 4.8, location: { lat: 39, lng: -120 } },
    { elevation: 770.2, resolution: 610.8, location: { lat: 36, lng: -118 } },
  ],
});

Deno.test("elevation-get: reads points and reports the range", async () => {
  const { ctx, calls } = mockCtx([points]);
  const result = await action.execute!({ locations: "39,-120|36,-118" }, ctx) as {
    count: number;
    minElevation: number;
    maxElevation: number;
  };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/maps/api/elevation/json");
  assertEquals(url.searchParams.get("locations"), "39,-120|36,-118");
  assertEquals(result.count, 2);
  assertEquals(result.minElevation, 770.2);
  assertEquals(result.maxElevation, 1608.6);
});

/**
 * A resolution of 610 metres means "the elevation of this building" is the
 * average elevation of half a square kilometre.
 */
Deno.test("elevation-get: reports the COARSEST resolution, which limits what the numbers mean", async () => {
  const { ctx } = mockCtx([points]);
  const result = await action.execute!({ locations: "39,-120|36,-118" }, ctx) as {
    worstResolution: number;
  };
  assertEquals(result.worstResolution, 610.8);
});

Deno.test("elevation-get: a path is sampled rather than sent point for point", async () => {
  const { ctx, calls } = mockCtx([points]);
  await action.execute!({ path: "39,-120|36,-118", samples: 50 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("path"), "39,-120|36,-118");
  assertEquals(url.searchParams.get("samples"), "50");
  assertEquals(url.searchParams.has("locations"), false);
});

Deno.test("elevation-get: the two modes are mutually exclusive", async () => {
  const both = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ locations: "1,2", path: "1,2|3,4" }, both.ctx),
    Error,
    "not both",
  );
  assertEquals(both.calls.length, 0);

  const neither = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({}, neither.ctx),
    Error,
    "`locations` or a `path`",
  );
});

Deno.test("elevation-get: a swapped pair is caught before the request", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ locations: "-120,39" }, ctx),
    Error,
    "LATITUDE FIRST",
  );
});

Deno.test("elevation-get: an empty result set does not produce NaN bounds", async () => {
  const { ctx } = mockCtx([legacy({ status: "ZERO_RESULTS", results: [] })]);
  const result = await action.execute!({ locations: "0,0" }, ctx) as {
    count: number;
    minElevation?: number;
    worstResolution?: number;
  };
  assertEquals(result.count, 0);
  assertEquals(result.minElevation, undefined);
  assertEquals(result.worstResolution, undefined);
});

Deno.test("elevation-get: a missing resolution does not become the worst one", async () => {
  const { ctx } = mockCtx([
    legacy({ status: "OK", results: [{ elevation: 10 }, { elevation: 20, resolution: 9.6 }] }),
  ]);
  const result = await action.execute!({ locations: "1,2|3,4" }, ctx) as {
    worstResolution: number;
  };
  assertEquals(result.worstResolution, 9.6);
});

Deno.test("elevation-get: a refused key throws despite the 200", async () => {
  const { ctx } = mockCtx([legacy({ status: "REQUEST_DENIED", error_message: "invalid" })]);
  await assertRejects(
    async () => await action.execute!({ locations: "1,2" }, ctx),
    Error,
    "REQUEST_DENIED",
  );
});

Deno.test("elevation-get: says the resolution is part of the answer", () => {
  assert(/RESOLUTION/.test(action.description!), action.description);
});
