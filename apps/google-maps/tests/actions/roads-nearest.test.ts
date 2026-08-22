import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { rpc } from "./_shared.ts";
import action from "../../actions/roads-nearest.ts";

/** The middle point had no road nearby and is simply absent. */
const partial = rpc({
  snappedPoints: [
    { placeId: "road-1", originalIndex: 0 },
    { placeId: "road-2", originalIndex: 2 },
  ],
});

Deno.test("roads-nearest: calls the independent endpoint, not the trace one", async () => {
  const { ctx, calls } = mockCtx([partial]);
  await action.execute!({ points: "60.17,24.94|0,0|60.17,24.96" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/nearestRoads");
  assertEquals(url.searchParams.get("points"), "60.17,24.94|0,0|60.17,24.96");
});

/**
 * A point at sea returns nothing for that index rather than an error, so the
 * response can be shorter than the input.
 */
Deno.test("roads-nearest: works out which points had no road nearby", async () => {
  const { ctx } = mockCtx([partial]);
  const result = await action.execute!({ points: "60.17,24.94|0,0|60.17,24.96" }, ctx) as {
    count: number;
    inputCount: number;
    unmatched: number[];
  };
  assertEquals(result.inputCount, 3);
  assertEquals(result.count, 2);
  assertEquals(result.unmatched, [1]);
});

Deno.test("roads-nearest: everything matching leaves no gaps", async () => {
  const { ctx } = mockCtx([
    rpc({
      snappedPoints: [{ placeId: "a", originalIndex: 0 }, { placeId: "b", originalIndex: 1 }],
    }),
  ]);
  const result = await action.execute!({ points: "1,2|3,4" }, ctx) as { unmatched: number[] };
  assertEquals(result.unmatched, []);
});

Deno.test("roads-nearest: nothing matching reports every index", async () => {
  const { ctx } = mockCtx([rpc({ snappedPoints: [] })]);
  const result = await action.execute!({ points: "0,0|0,1" }, ctx) as { unmatched: number[] };
  assertEquals(result.unmatched, [0, 1]);
});

Deno.test("roads-nearest: more than 100 points is refused", async () => {
  const many = Array.from({ length: 101 }, (_, i) => `60.${i},24.9`).join("|");
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ points: many }, ctx),
    Error,
    "at most 100",
  );
  assertEquals(calls.length, 0);
});

Deno.test("roads-nearest: the travel mode is passed through", async () => {
  const { ctx, calls } = mockCtx([partial]);
  await action.execute!({ points: "1,2", travelMode: "walking" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("travelMode"), "walking");
});

Deno.test("roads-nearest: logs sizes, never the points", async () => {
  const { ctx, logs } = mockCtx([partial]);
  await action.execute!({ points: "60.17,24.94|0,0|60.17,24.96" }, ctx);
  assert(!JSON.stringify(logs).includes("60.17"), JSON.stringify(logs));
  assertEquals(logs[0].data, { inputCount: 3, count: 2, unmatched: 1 });
});

Deno.test("roads-nearest: needs points", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`points` is required");
});

/** The two Roads actions look identical and answer different questions. */
Deno.test("roads-nearest: says what separates it from roads-snap", () => {
  assert(/INDEPENDENTLY/.test(action.description!), action.description);
  assert(/roads-snap/.test(action.description!), action.description);
});
