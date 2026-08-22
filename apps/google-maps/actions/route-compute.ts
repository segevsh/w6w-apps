import type { ActionDefinition } from "@w6w/types";
import { compact, HOSTS, MapsClient } from "../lib/client.ts";
import { DEFAULT_ROUTE_FIELDS } from "../lib/fields.ts";
import { fieldMaskParam, LANGUAGE_PARAM, REGION_PARAM } from "../lib/params.ts";
import { waypoint, waypointKind } from "../lib/waypoint.ts";

/**
 * `POST routes.googleapis.com/directions/v2:computeRoutes` — a route between
 * two points, with the traffic model as an explicit choice.
 *
 * ## `routingPreference` is the money-and-accuracy dial
 *
 * `TRAFFIC_UNAWARE` uses no live traffic at all: fast, cheap, and it answers a
 * different question from the one a dispatcher is asking. `TRAFFIC_AWARE` is
 * the sensible middle. `TRAFFIC_AWARE_OPTIMAL` is the most accurate, the
 * slowest, and billed at a higher SKU.
 *
 * The default here is `TRAFFIC_AWARE`, because a duration with no traffic in it
 * is not a duration anybody can plan around — and because the alternative,
 * defaulting to the cheapest, means every workflow silently gets the answer to
 * a question it did not ask.
 *
 * ## `duration` and `staticDuration` are different numbers
 *
 * `duration` includes traffic; `staticDuration` does not. Both come back as
 * strings like `"1234s"`, not as numbers of seconds, so arithmetic on them
 * silently produces `NaN` or string concatenation. This action parses both.
 *
 * ## `departureTime` changes the answer, and omitting it means "now"
 *
 * A route computed on Tuesday for a Saturday delivery, without a departure
 * time, is priced against Tuesday's traffic. There is no warning.
 */
const action: ActionDefinition = {
  key: "route-compute",
  type: "read",
  resource: "route",
  title: "Compute a route",
  description:
    "A route between two points. Durations come back as strings like `1234s` and are parsed " +
    "here; the traffic model is an explicit choice, because it changes the answer.",
  params: [
    {
      key: "origin",
      label: "From",
      type: "string",
      required: true,
      default: "",
      hint: "An address, a `lat,lng`, or a place id. A place id is exact; an address is " +
        "geocoded silently, ambiguity and all.",
    },
    {
      key: "destination",
      label: "To",
      type: "string",
      required: true,
      default: "",
      hint: "Same three forms.",
    },
    {
      key: "intermediates",
      label: "Via",
      type: "string",
      default: "",
      hint: "Up to 25 waypoints, one per line or separated by `|`.",
    },
    {
      key: "travelMode",
      label: "Travel Mode",
      type: "select",
      default: "DRIVE",
      options: [
        { value: "DRIVE", label: "Drive" },
        { value: "BICYCLE", label: "Bicycle" },
        { value: "WALK", label: "Walk" },
        { value: "TWO_WHEELER", label: "Two-wheeler" },
        { value: "TRANSIT", label: "Transit" },
      ],
    },
    {
      key: "routingPreference",
      label: "Traffic",
      type: "select",
      default: "TRAFFIC_AWARE",
      options: [
        { value: "TRAFFIC_AWARE", label: "TRAFFIC_AWARE — live traffic, the usual choice" },
        { value: "TRAFFIC_UNAWARE", label: "TRAFFIC_UNAWARE — cheapest, ignores traffic entirely" },
        {
          value: "TRAFFIC_AWARE_OPTIMAL",
          label: "TRAFFIC_AWARE_OPTIMAL — most accurate, priciest",
        },
      ],
      hint: "Only applies to DRIVE and TWO_WHEELER. Google's own default is UNAWARE; this " +
        "defaults to AWARE, because a duration with no traffic in it is not a plannable number.",
    },
    {
      key: "departureTime",
      label: "Departure Time",
      type: "string",
      default: "",
      hint: "RFC 3339. Omitted means NOW — so a Saturday delivery planned on Tuesday gets " +
        "Tuesday's traffic, silently.",
    },
    { key: "avoidTolls", label: "Avoid Tolls", type: "boolean", default: false },
    { key: "avoidHighways", label: "Avoid Highways", type: "boolean", default: false },
    { key: "avoidFerries", label: "Avoid Ferries", type: "boolean", default: false },
    {
      key: "computeAlternativeRoutes",
      label: "Alternatives",
      type: "boolean",
      default: false,
      hint: "Not available when there are intermediate waypoints.",
    },
    {
      key: "optimizeWaypointOrder",
      label: "Optimise Waypoint Order",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Reorders the intermediates for the shortest total route, and reports the order it " +
        "chose.",
    },
    {
      key: "units",
      label: "Units",
      type: "select",
      default: "METRIC",
      advanced: true,
      options: [
        { value: "METRIC", label: "Metric" },
        { value: "IMPERIAL", label: "Imperial" },
      ],
      hint: "Affects only the localised text — `distanceMeters` is always metres.",
    },
    fieldMaskParam(
      DEFAULT_ROUTE_FIELDS,
      "Routes requires a mask too. `routes.legs.steps` is where the size explodes — a long route " +
        "with turn-by-turn instructions is megabytes.",
    ),
    LANGUAGE_PARAM,
    REGION_PARAM,
  ],
  output: [
    { key: "found", type: "boolean", label: "Whether a route exists" },
    { key: "durationSeconds", type: "number", label: "With traffic, parsed from `1234s`" },
    { key: "staticDurationSeconds", type: "number", label: "Without traffic" },
    { key: "distanceMeters", type: "number", label: "Distance" },
    { key: "polyline", type: "string", label: "Encoded polyline, if asked for" },
    { key: "waypointOrder", type: "array", label: "Optimised order, when asked for" },
    { key: "routes", type: "array", label: "Every route returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const origin = waypoint(p.origin, "origin");
    const destination = waypoint(p.destination, "destination");
    const intermediates = String(p.intermediates ?? "").split(/[|\n]/).map((s) => s.trim())
      .filter(Boolean).map((s, i) => waypoint(s, `intermediates[${i}]`));
    if (intermediates.length > 25) {
      throw new Error(
        `Routes takes at most 25 intermediate waypoints — got ${intermediates.length}`,
      );
    }

    const mode = String(p.travelMode ?? "DRIVE");
    const trafficApplies = mode === "DRIVE" || mode === "TWO_WHEELER";

    const result = await new MapsClient(ctx).rpc<{
      routes?: Array<{
        duration?: string;
        staticDuration?: string;
        distanceMeters?: number;
        polyline?: { encodedPolyline?: string };
        optimizedIntermediateWaypointIndex?: number[];
      }>;
    }>(HOSTS.routes, "/directions/v2:computeRoutes", {
      method: "POST",
      fieldMask: String(p.fieldMask ?? DEFAULT_ROUTE_FIELDS).trim() || DEFAULT_ROUTE_FIELDS,
      body: compact({
        origin,
        destination,
        intermediates,
        travelMode: mode,
        // Sending it for WALK or BICYCLE is an error rather than a no-op.
        routingPreference: trafficApplies ? p.routingPreference : undefined,
        departureTime: p.departureTime,
        computeAlternativeRoutes: p.computeAlternativeRoutes === true ? true : undefined,
        optimizeWaypointOrder: p.optimizeWaypointOrder === true ? true : undefined,
        units: p.units,
        languageCode: p.languageCode,
        regionCode: p.regionCode,
        // An empty modifiers object is not the same as none — send neither.
        routeModifiers: emptyToUndefined(compact({
          avoidTolls: p.avoidTolls === true ? true : undefined,
          avoidHighways: p.avoidHighways === true ? true : undefined,
          avoidFerries: p.avoidFerries === true ? true : undefined,
        })),
      }),
    });

    const routes = result?.routes ?? [];
    const best = routes[0];
    ctx.log("info", "computed a route", {
      routes: routes.length,
      origin: waypointKind(origin),
      destination: waypointKind(destination),
      traffic: trafficApplies ? p.routingPreference : "n/a",
    });

    return {
      // No route between two points is a legitimate answer — an island, or a
      // DRIVE across an ocean — and Routes returns an empty array for it.
      found: routes.length > 0,
      durationSeconds: parseDuration(best?.duration),
      staticDurationSeconds: parseDuration(best?.staticDuration),
      distanceMeters: best?.distanceMeters,
      polyline: best?.polyline?.encodedPolyline,
      waypointOrder: best?.optimizedIntermediateWaypointIndex,
      routes,
    };
  },
};

/** An object with no keys is nothing to send. */
function emptyToUndefined(obj: Record<string, unknown>): Record<string, unknown> | undefined {
  return Object.keys(obj).length === 0 ? undefined : obj;
}

/** Google's protobuf Duration on the wire: `"1234s"`, or `"1234.5s"`. */
export function parseDuration(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const text = String(value);
  const match = /^(-?\d+(?:\.\d+)?)s$/.exec(text.trim());
  if (!match) return undefined;
  return Number(match[1]);
}

export default action;
