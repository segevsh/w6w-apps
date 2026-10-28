import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { rpc } from "./_shared.ts";
import action from "../../actions/roads-snap.ts";

const snapped = rpc({
  snappedPoints: [
    { placeId: "road-1", originalIndex: 0, location: { latitude: 60.17, longitude: 24.94 } },
    { placeId: "road-1", originalIndex: 1, location: { latitude: 60.17, longitude: 24.95 } },
    { placeId: "road-2", originalIndex: 2, location: { latitude: 60.17, longitude: 24.96 } },
  ],
});

Deno.test("roads-snap: sends the path in travel order and reports the segments", async () => {
  const { ctx, calls } = mockCtx([snapped]);
  const result = await action.execute!({ path: "60.17,24.94|60.17,24.95|60.17,24.96" }, ctx) as {
    count: number;
    placeIds: string[];
  };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/snapToRoads");
  assertEquals(url.searchParams.get("path"), "60.17,24.94|60.17,24.95|60.17,24.96");
  assertEquals(result.count, 3);
  assertEquals(result.placeIds, ["road-1", "road-2"], "the distinct roads, not one per point");
});

/**
 * Truncating would produce a plausible, shorter, wrong route — the failure this
 * refusal exists to prevent.
 */
Deno.test("roads-snap: more than 100 points is refused rather than truncated", async () => {
  const long = Array.from({ length: 101 }, (_, i) => `60.${i},24.9`).join("|");
  const { ctx, calls } = mockCtx([]);
  const error = await assertRejects(
    async () => await action.execute!({ path: long }, ctx),
    Error,
  );
  assert(/at most 100/.test(error.message), error.message);
  assert(/overlapping batches/.test(error.message), error.message);
  assertEquals(calls.length, 0);
});

Deno.test("roads-snap: exactly 100 points is allowed", async () => {
  const hundred = Array.from({ length: 100 }, (_, i) => `60.${i},24.9`).join("|");
  const { ctx, calls } = mockCtx([snapped]);
  await action.execute!({ path: hundred }, ctx);
  assertEquals(calls.length, 1);
});

/** Interpolation makes the output longer than the input. */
Deno.test("roads-snap: interpolate is opt-in and sent only when on", async () => {
  const off = mockCtx([snapped]);
  await action.execute!({ path: "1,2|3,4" }, off.ctx);
  assertEquals(new URL(off.calls[0].url).searchParams.has("interpolate"), false);

  const on = mockCtx([snapped]);
  await action.execute!({ path: "1,2|3,4", interpolate: true }, on.ctx);
  assertEquals(new URL(on.calls[0].url).searchParams.get("interpolate"), "true");
});

Deno.test("roads-snap: the travel mode constrains which paths are considered", async () => {
  const { ctx, calls } = mockCtx([snapped]);
  await action.execute!({ path: "1,2|3,4", travelMode: "cycling" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("travelMode"), "cycling");
});

Deno.test("roads-snap: Google's own warning is passed through", async () => {
  const { ctx } = mockCtx([
    rpc({ snappedPoints: [], warningMessage: "Input path is too sparse" }),
  ]);
  const result = await action.execute!({ path: "1,2|3,4" }, ctx) as { warning: string };
  assertEquals(result.warning, "Input path is too sparse");
});

Deno.test("roads-snap: a swapped point is caught before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ path: "60.17,24.94|124.94,60.17" }, ctx),
    Error,
    "path[1]",
  );
  assertEquals(calls.length, 0);
});

Deno.test("roads-snap: logs sizes, never the trace", async () => {
  const { ctx, logs } = mockCtx([snapped]);
  await action.execute!({ path: "60.17,24.94|60.17,24.95|60.17,24.96" }, ctx);
  assert(!JSON.stringify(logs).includes("60.17"), JSON.stringify(logs));
  assertEquals(logs[0].data, { inputCount: 3, count: 3, segments: 2 });
});

Deno.test("roads-snap: needs a path", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`path` is required");
});
