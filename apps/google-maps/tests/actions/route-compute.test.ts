import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { rpc } from "./_shared.ts";
import action, { parseDuration } from "../../actions/route-compute.ts";

const route = rpc({
  routes: [{
    duration: "5400s",
    staticDuration: "4800s",
    distanceMeters: 86_400,
    polyline: { encodedPolyline: "abc" },
  }],
});

/** Durations arrive as strings like `"5400s"`; arithmetic on them yields NaN. */
Deno.test("route-compute: parses the protobuf duration into seconds", async () => {
  const { ctx } = mockCtx([route]);
  const result = await action.execute!({ origin: "A St", destination: "B St" }, ctx) as {
    durationSeconds: number;
    staticDurationSeconds: number;
    distanceMeters: number;
  };
  assertEquals(result.durationSeconds, 5400);
  assertEquals(result.staticDurationSeconds, 4800);
  assertEquals(result.distanceMeters, 86_400);
});

Deno.test("route-compute: parseDuration handles fractions and refuses anything else", () => {
  assertEquals(parseDuration("5400s"), 5400);
  assertEquals(parseDuration("12.5s"), 12.5);
  assertEquals(parseDuration("5400"), undefined);
  assertEquals(parseDuration(undefined), undefined);
  assertEquals(parseDuration(""), undefined);
});

/** Each waypoint form is exact in a different way, and Routes wants a shape. */
Deno.test("route-compute: picks the waypoint form from the input", async () => {
  const { ctx, calls } = mockCtx([route]);
  await action.execute!({
    origin: "51.5,-0.12",
    destination: "ChIJN1t_tDeuEmsRUsoyG83frY4",
    intermediates: "10 Downing Street, London",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.origin, { location: { latLng: { latitude: 51.5, longitude: -0.12 } } });
  assertEquals(body.destination, { placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4" });
  assertEquals(body.intermediates, [{ address: "10 Downing Street, London" }]);
});

/**
 * Google's own default is TRAFFIC_UNAWARE, which answers a different question
 * from the one a dispatcher is asking.
 */
Deno.test("route-compute: defaults to traffic-aware, against Google's default", async () => {
  const { ctx, calls } = mockCtx([route]);
  await action.execute!({ origin: "A", destination: "B", routingPreference: "TRAFFIC_AWARE" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).routingPreference, "TRAFFIC_AWARE");
  const wait = action.params!.find((p) => p.key === "routingPreference")!;
  assertEquals(wait.default, "TRAFFIC_AWARE");
});

/** Sending a routing preference for WALK is an error, not a no-op. */
Deno.test("route-compute: traffic preference is dropped for modes that cannot use it", async () => {
  const { ctx, calls } = mockCtx([route]);
  await action.execute!({
    origin: "A",
    destination: "B",
    travelMode: "WALK",
    routingPreference: "TRAFFIC_AWARE",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).routingPreference, undefined);
});

Deno.test("route-compute: avoidances become route modifiers, and are omitted when off", async () => {
  const on = mockCtx([route]);
  await action.execute!({ origin: "A", destination: "B", avoidTolls: true }, on.ctx);
  assertEquals(JSON.parse(on.calls[0].body!).routeModifiers, { avoidTolls: true });

  const off = mockCtx([route]);
  await action.execute!({ origin: "A", destination: "B" }, off.ctx);
  assertEquals(JSON.parse(off.calls[0].body!).routeModifiers, undefined);
});

Deno.test("route-compute: intermediates split on pipes and newlines, and are capped at 25", async () => {
  const ok = mockCtx([route]);
  await action.execute!({ origin: "A", destination: "B", intermediates: "C|D\nE" }, ok.ctx);
  assertEquals(JSON.parse(ok.calls[0].body!).intermediates.length, 3);

  const many = Array.from({ length: 26 }, (_, i) => `Stop ${i}`).join("|");
  const over = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!({ origin: "A", destination: "B", intermediates: many }, over.ctx),
    Error,
    "at most 25",
  );
  assertEquals(over.calls.length, 0);
});

/** No route between two points is an answer — an island, or a drive across an ocean. */
Deno.test("route-compute: no route is found:false rather than an error", async () => {
  const { ctx } = mockCtx([rpc({ routes: [] })]);
  const result = await action.execute!({ origin: "A", destination: "B" }, ctx) as {
    found: boolean;
    durationSeconds?: number;
  };
  assertEquals(result.found, false);
  assertEquals(result.durationSeconds, undefined);
});

Deno.test("route-compute: the field mask is sent as a header", async () => {
  const { ctx, calls } = mockCtx([route]);
  await action.execute!({ origin: "A", destination: "B" }, ctx);
  assert(
    calls[0].headers["x-goog-fieldmask"].includes("routes.duration"),
    calls[0].headers["x-goog-fieldmask"],
  );
});

/** Addresses are places people live. */
Deno.test("route-compute: logs which waypoint form was used, never the addresses", async () => {
  const { ctx, logs } = mockCtx([route]);
  await action.execute!({ origin: "221B Baker Street", destination: "51.5,-0.12" }, ctx);
  assert(!JSON.stringify(logs).includes("Baker"), JSON.stringify(logs));
  assertEquals(logs[0].data, {
    routes: 1,
    origin: "address",
    destination: "location",
    traffic: undefined,
  });
});

Deno.test("route-compute: needs both ends", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ destination: "B" }, ctx),
    Error,
    "`origin` is required",
  );
});
