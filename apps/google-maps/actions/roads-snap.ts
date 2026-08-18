import type { ActionDefinition } from "@w6w/types";
import { HOSTS, latLngPath, MapsClient, pointString, query } from "../lib/client.ts";

/**
 * `GET roads.googleapis.com/v1/snapToRoads` — pull a GPS trace onto the roads
 * it was actually driven on.
 *
 * ## What it is for
 *
 * Raw GPS wanders: through buildings, across central reservations, into the
 * river. Snapping produces the sequence of road points the vehicle plausibly
 * travelled, which is what mileage claims, delivery proofs and route replay all
 * need. Doing the same thing by rounding coordinates is how a lorry ends up
 * billed for a route down a footpath.
 *
 * ## A hundred points at a time
 *
 * The limit is **100 points per request**, and a long trace has to be split.
 * The seam matters: snap two halves independently and the joint may not line
 * up, because each half is snapped without knowing about the other. Overlapping
 * the batches by a few points and discarding the duplicates is the usual fix,
 * and it is the caller's job — this action refuses more than 100 rather than
 * silently truncating, which is the failure that produces a plausible, shorter,
 * wrong route.
 *
 * ## `interpolate` changes what comes back, not just how much
 *
 * Off, you get one snapped point per input point. On, Google fills in the road
 * geometry between them — so the output is longer than the input and the
 * indices no longer line up one to one. `originalIndex` is present only on the
 * points that came from your input, and is absent on the interpolated ones.
 */
const action: ActionDefinition = {
  key: "roads-snap",
  type: "search",
  resource: "road",
  title: "Snap a trace to roads",
  description:
    "Pull a GPS trace onto real roads. Capped at 100 points per request — this refuses more " +
    "rather than truncating, because a silently shortened route looks perfectly plausible.",
  params: [
    {
      key: "path",
      label: "Path",
      type: "string",
      required: true,
      default: "",
      hint: "`lat,lng|lat,lng|…` in travel order, up to 100 points. Order matters — this is a " +
        "trace, not a set.",
    },
    {
      key: "interpolate",
      label: "Interpolate",
      type: "boolean",
      default: false,
      hint: "Fills in the road geometry between your points. The output is then LONGER than the " +
        "input, and `originalIndex` is absent on the added points.",
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
      hint: "Constrains which paths are considered — cycling will use routes a car cannot.",
    },
  ],
  output: [
    { key: "snappedPoints", type: "array", label: "Points on the road network, in order" },
    { key: "count", type: "number", label: "Points returned" },
    { key: "inputCount", type: "number", label: "Points sent" },
    { key: "placeIds", type: "array", label: "The road segments travelled, de-duplicated" },
    { key: "warning", type: "string", label: "Google's own warning, when it gives one" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const points = latLngPath(p.path, "path");
    if (points.length > 100) {
      throw new Error(
        `\`path\` has ${points.length} points and Roads takes at most 100 per request. Split it ` +
          "into overlapping batches and drop the duplicates at each seam — snapping halves " +
          "independently can leave the joint misaligned",
      );
    }

    const result = await new MapsClient(ctx).rpc<{
      snappedPoints?: Array<{ placeId?: string; originalIndex?: number }>;
      warningMessage?: string;
    }>(HOSTS.roads, "/v1/snapToRoads", {
      query: query({
        path: points.map(pointString).join("|"),
        interpolate: p.interpolate === true ? true : undefined,
        travelMode: p.travelMode,
      }),
    });

    const snapped = result?.snappedPoints ?? [];
    // The distinct road segments, which is what a mileage or route-replay step
    // actually consumes.
    const placeIds = [...new Set(snapped.map((s) => s?.placeId).filter(Boolean))] as string[];

    ctx.log("info", "snapped a trace to roads", {
      inputCount: points.length,
      count: snapped.length,
      segments: placeIds.length,
    });

    return {
      snappedPoints: snapped,
      count: snapped.length,
      inputCount: points.length,
      placeIds,
      warning: result?.warningMessage,
    };
  },
};

export default action;
