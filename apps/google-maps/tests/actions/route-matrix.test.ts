import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { rpc } from "./_shared.ts";
import action from "../../actions/route-matrix.ts";

const grid = rpc([
  // Deliberately out of order — the indices are the only reliable pairing.
  {
    originIndex: 1,
    destinationIndex: 0,
    condition: "ROUTE_EXISTS",
    duration: "600s",
    distanceMeters: 5000,
  },
  {
    originIndex: 0,
    destinationIndex: 0,
    condition: "ROUTE_EXISTS",
    duration: "300s",
    distanceMeters: 2000,
  },
  { originIndex: 0, destinationIndex: 1, condition: "ROUTE_NOT_FOUND" },
  { originIndex: 1, destinationIndex: 1, status: { code: 3, message: "Invalid waypoint" } },
]);

Deno.test("route-matrix: posts origins and destinations as waypoint wrappers", async () => {
  const { ctx, calls } = mockCtx([grid]);
  await action.execute!({ origins: "A|51.5,-0.12", destinations: "C|D" }, ctx);
  assertEquals(calls[0].url, "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.origins[0], { waypoint: { address: "A" } });
  assertEquals(body.origins[1], {
    waypoint: { location: { latLng: { latitude: 51.5, longitude: -0.12 } } },
  });
  assertEquals(body.destinations.length, 2);
});

/** Elements arrive in no guaranteed order — reading them positionally mis-pairs. */
Deno.test("route-matrix: reshapes by index, not by position", async () => {
  const { ctx } = mockCtx([grid]);
  const result = await action.execute!({ origins: "A|B", destinations: "C|D" }, ctx) as {
    grid: Array<Array<{ durationSeconds?: number }>>;
  };
  assertEquals(result.grid[0][0].durationSeconds, 300);
  assertEquals(result.grid[1][0].durationSeconds, 600);
});

/**
 * The documented trap: an element can fail inside a clean 200, and without
 * `status` in the mask it is indistinguishable from a success.
 */
Deno.test("route-matrix: counts the pairs that failed inside the 200", async () => {
  const { ctx } = mockCtx([grid]);
  const result = await action.execute!({ origins: "A|B", destinations: "C|D" }, ctx) as {
    failed: number;
    unreachable: number;
    count: number;
  };
  assertEquals(result.count, 4);
  assertEquals(result.failed, 1);
  assertEquals(result.unreachable, 1, "no route is an answer, not a failure");
});

Deno.test("route-matrix: a mask without status is refused before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!({
        origins: "A",
        destinations: "B",
        fieldMask: "originIndex,destinationIndex,duration",
      }, ctx),
    Error,
    "must include `status`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("route-matrix: the default mask carries status and condition", async () => {
  const { ctx, calls } = mockCtx([grid]);
  await action.execute!({ origins: "A", destinations: "B" }, ctx);
  const mask = calls[0].headers["x-goog-fieldmask"];
  assert(mask.includes("status"), mask);
  assert(mask.includes("condition"), mask);
});

Deno.test("route-matrix: traffic preference is dropped for modes that cannot use it", async () => {
  const { ctx, calls } = mockCtx([grid]);
  await action.execute!({
    origins: "A",
    destinations: "B",
    travelMode: "BICYCLE",
    routingPreference: "TRAFFIC_AWARE",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).routingPreference, undefined);
});

Deno.test("route-matrix: needs at least one of each", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ origins: "", destinations: "B" }, ctx),
    Error,
    "at least one origin",
  );
  assertEquals(calls.length, 0);
});

Deno.test("route-matrix: logs the shape of the job and how much of it failed", async () => {
  const { ctx, logs } = mockCtx([grid]);
  await action.execute!({ origins: "221B Baker Street|B", destinations: "C|D" }, ctx);
  assert(!JSON.stringify(logs).includes("Baker"), JSON.stringify(logs));
  assertEquals(logs[0].data, { pairs: 4, returned: 4, failed: 1, unreachable: 1 });
});

Deno.test("route-matrix: says a pair can fail inside a successful response", () => {
  assert(/can FAIL inside a successful response/.test(action.description!), action.description);
});
