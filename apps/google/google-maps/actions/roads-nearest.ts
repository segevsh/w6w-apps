import type { ActionDefinition } from "@w6w/types";
import { HOSTS, latLngPath, MapsClient, pointString, query } from "../lib/client.ts";

/**
 * `GET roads.googleapis.com/v1/nearestRoads` — the closest road to each of a
 * set of points.
 *
 * ## Not the same as `roads-snap`, and the difference is order
 *
 * Snapping treats the input as a **trace**: a sequence, travelled in order, and
 * it uses that order to decide which road is plausible. This treats each point
 * as **independent** — no order, no route, just "what road is nearest this".
 *
 * Using this on a trace gives a point-by-point nearest road that can jump
 * between a motorway and the service road beside it every few seconds, because
 * nothing tells it those points form a journey. Using `roads-snap` on unrelated
 * points invents a journey that never happened. They are not interchangeable
 * even though the inputs look identical.
 *
 * ## The limit here is 100 too
 *
 * And a point in the middle of the sea returns nothing for that index rather
 * than an error — so the response can be shorter than the input, and
 * `originalIndex` is how you tell which points were dropped.
 */
const action: ActionDefinition = {
  key: "roads-nearest",
  type: "search",
  resource: "road",
  title: "Find the nearest roads",
  description:
    "The closest road to each point, treated INDEPENDENTLY — no order and no journey, which is " +
    "what separates this from `roads-snap`. Points with no road nearby are simply absent.",
  params: [
    {
      key: "points",
      label: "Points",
      type: "string",
      required: true,
      default: "",
      hint: "`lat,lng|lat,lng|…`, up to 100. Order is irrelevant here — if it matters, you want " +
        "`roads-snap`.",
    },
    {
      key: "travelMode",
      label: "Travel Mode",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "Unspecified" },
        { value: "driving", label: "driving" },
        { value: "cycling", label: "cycling" },
        { value: "walking", label: "walking" },
      ],
    },
  ],
  output: [
    { key: "snappedPoints", type: "array", label: "One per point that had a road nearby" },
    { key: "count", type: "number", label: "Points that matched" },
    { key: "inputCount", type: "number", label: "Points sent" },
    { key: "unmatched", type: "array", label: "Indices of points with no road nearby" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const points = latLngPath(p.points, "points");
    if (points.length > 100) {
      throw new Error(
        `\`points\` has ${points.length} and Roads takes at most 100 per request`,
      );
    }

    const result = await new MapsClient(ctx).rpc<{
      snappedPoints?: Array<{ placeId?: string; originalIndex?: number }>;
    }>(HOSTS.roads, "/v1/nearestRoads", {
      query: query({
        points: points.map(pointString).join("|"),
        travelMode: p.travelMode,
      }),
    });

    const snapped = result?.snappedPoints ?? [];
    // A point in a field or at sea is absent rather than null, so the gaps have
    // to be worked out from the indices that came back.
    const matched = new Set(snapped.map((s) => Number(s?.originalIndex ?? -1)));
    const unmatched = points.map((_, i) => i).filter((i) => !matched.has(i));

    ctx.log("info", "found the nearest roads", {
      inputCount: points.length,
      count: snapped.length,
      unmatched: unmatched.length,
    });

    return { snappedPoints: snapped, count: snapped.length, inputCount: points.length, unmatched };
  },
};

export default action;
