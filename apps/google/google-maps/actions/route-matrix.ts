import type { ActionDefinition } from "@w6w/types";
import { compact, HOSTS, MapsClient } from "../lib/client.ts";
import { DEFAULT_MATRIX_FIELDS } from "../lib/fields.ts";
import { fieldMaskParam } from "../lib/params.ts";
import { parseDuration } from "./route-compute.ts";
import { waypoint } from "../lib/waypoint.ts";

/**
 * `POST routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` — every
 * origin to every destination.
 *
 * ## An element can fail while the response is a clean 200
 *
 * This is the trap, and Google's own documentation warns about it: each element
 * carries its own `status`, and **if you leave `status` out of the field mask
 * you cannot tell a failed pair from a successful one**. The element simply
 * arrives with no duration, which reads as zero to anything not looking
 * closely. The documentation's phrase is "to avoid false success indicators".
 *
 * So `status` and `condition` are in the default mask here, the action counts
 * the elements that failed, and it returns `failed` alongside the results
 * rather than making a caller notice absence.
 *
 * `condition` is the other half: `ROUTE_EXISTS` or `ROUTE_NOT_FOUND`. A pair
 * with no route is not an error — it is an answer, and it needs to be
 * distinguishable from a pair that errored.
 *
 * ## The response is a stream, not an object
 *
 * The body is a JSON array of elements, each tagged with `originIndex` and
 * `destinationIndex`. They are **not necessarily in order**, which is exactly
 * why those indices exist, and reading them positionally will eventually pair
 * the wrong origin with the wrong destination. This action reshapes them into a
 * grid keyed by index.
 *
 * ## The size limit is on the product
 *
 * Origins × destinations is capped (625 for most modes, fewer with a
 * traffic-aware preference), so a 30×30 matrix is fine and a 40×40 is not. The
 * refusal is an HTTP error, not a truncated grid.
 */
const action: ActionDefinition = {
  key: "route-matrix",
  type: "read",
  resource: "route",
  title: "Compute a route matrix",
  description:
    "Distances and durations for every origin/destination pair. An individual pair can FAIL " +
    "inside a successful response — the failures are counted and returned rather than left absent.",
  params: [
    {
      key: "origins",
      label: "Origins",
      type: "string",
      required: true,
      default: "",
      hint: "One per line, or separated by `|`. Addresses, `lat,lng`, or place ids.",
    },
    {
      key: "destinations",
      label: "Destinations",
      type: "string",
      required: true,
      default: "",
      hint: "Same forms. Origins × destinations is capped — 625 for most modes, fewer with " +
        "traffic-aware routing.",
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
        { value: "TRAFFIC_AWARE", label: "TRAFFIC_AWARE" },
        { value: "TRAFFIC_UNAWARE", label: "TRAFFIC_UNAWARE — cheapest, and a larger matrix cap" },
        { value: "TRAFFIC_AWARE_OPTIMAL", label: "TRAFFIC_AWARE_OPTIMAL" },
      ],
    },
    {
      key: "departureTime",
      label: "Departure Time",
      type: "string",
      default: "",
      hint: "RFC 3339. Omitted means now.",
    },
    fieldMaskParam(
      DEFAULT_MATRIX_FIELDS,
      "Keep `status` in here. Without it a failed pair is indistinguishable from a successful " +
        "one — Google's own wording is 'to avoid false success indicators'.",
    ),
  ],
  output: [
    { key: "elements", type: "array", label: "Every pair, with its own status" },
    { key: "grid", type: "array", label: "Rows of origins, columns of destinations" },
    { key: "count", type: "number", label: "Elements returned" },
    { key: "failed", type: "number", label: "Pairs that errored inside the 200" },
    { key: "unreachable", type: "number", label: "Pairs with no route — an answer, not an error" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const origins = splitPoints(p.origins, "origins");
    const destinations = splitPoints(p.destinations, "destinations");
    const pairs = origins.length * destinations.length;
    if (pairs === 0) throw new Error("give at least one origin and one destination");

    const fieldMask = String(p.fieldMask ?? DEFAULT_MATRIX_FIELDS).trim() || DEFAULT_MATRIX_FIELDS;
    if (!/\bstatus\b/.test(fieldMask)) {
      throw new Error(
        "`fieldMask` must include `status` — without it a pair that failed looks exactly like " +
          "one that succeeded with no duration, which is the documented way to read this API wrong",
      );
    }

    const elements = await new MapsClient(ctx).rpc<
      Array<{
        originIndex?: number;
        destinationIndex?: number;
        status?: { code?: number; message?: string };
        condition?: string;
        distanceMeters?: number;
        duration?: string;
      }>
    >(HOSTS.routes, "/distanceMatrix/v2:computeRouteMatrix", {
      method: "POST",
      fieldMask,
      body: compact({
        origins: origins.map((w) => ({ waypoint: w })),
        destinations: destinations.map((w) => ({ waypoint: w })),
        travelMode: p.travelMode,
        routingPreference: p.travelMode === "DRIVE" || p.travelMode === "TWO_WHEELER"
          ? p.routingPreference
          : undefined,
        departureTime: p.departureTime,
      }),
    });

    const list = Array.isArray(elements) ? elements : [];
    // Elements arrive in no guaranteed order — the indices are why.
    const grid: Array<Array<Record<string, unknown> | undefined>> = origins.map(() =>
      destinations.map(() => undefined)
    );
    let failed = 0;
    let unreachable = 0;

    for (const element of list) {
      const row = Number(element?.originIndex ?? -1);
      const column = Number(element?.destinationIndex ?? -1);
      // A non-zero gRPC code on the element is a per-pair failure.
      const isFailed = Number(element?.status?.code ?? 0) !== 0;
      if (isFailed) failed++;
      if (element?.condition === "ROUTE_NOT_FOUND") unreachable++;
      const cell = {
        distanceMeters: element?.distanceMeters,
        durationSeconds: parseDuration(element?.duration),
        condition: element?.condition,
        failed: isFailed,
        message: element?.status?.message,
      };
      if (grid[row] && column >= 0) grid[row][column] = cell;
    }

    ctx.log("info", "computed a route matrix", {
      pairs,
      returned: list.length,
      failed,
      unreachable,
    });

    return { elements: list, grid, count: list.length, failed, unreachable };
  },
};

/** One waypoint per line or per `|`. */
function splitPoints(value: unknown, field: string): Array<Record<string, unknown>> {
  return String(value ?? "").split(/[|\n]/).map((s) => s.trim()).filter(Boolean)
    .map((s, i) => waypoint(s, `${field}[${i}]`));
}

export default action;
