import type { ActionDefinition } from "@w6w/types";
import { latLngPath, MapsClient, pointString, query } from "../lib/client.ts";

/**
 * `GET /maps/api/elevation/json` — height above sea level, for points or along
 * a path.
 *
 * ## `resolution` is the part that matters, and it is easy to ignore
 *
 * Every result carries a `resolution` in metres: the distance between the
 * sample points in the underlying model. A resolution of 4.8 means the number
 * is interpolated from a grid roughly five metres across; a resolution of 610
 * means the grid squares are six hundred metres wide, and the "elevation of
 * this building" is really the average elevation of half a square kilometre.
 *
 * Both come back as a plain number of metres to two decimal places. This action
 * returns `worstResolution` alongside, because a caller deciding anything on
 * the basis of a metre or two needs to know whether the model has a metre or
 * two to give.
 *
 * ## Two modes, and the second one samples
 *
 * Give `locations` and you get one result per point. Give `path` and `samples`
 * and Google walks the line, returning `samples` evenly-spaced elevations —
 * which is what a gradient profile actually needs, and much cheaper than
 * asking for the points one at a time.
 */
const action: ActionDefinition = {
  key: "elevation-get",
  type: "read",
  resource: "elevation",
  title: "Get elevation",
  description:
    "Height above sea level for points, or sampled along a path. Every result carries the " +
    "RESOLUTION of the underlying model, which is often hundreds of metres.",
  params: [
    {
      key: "locations",
      label: "Points",
      type: "string",
      default: "",
      hint: "`lat,lng|lat,lng|…`. Give these or a path.",
    },
    {
      key: "path",
      label: "Path",
      type: "string",
      default: "",
      hint: "`lat,lng|lat,lng|…` describing a line. Sampled rather than returned point for point.",
    },
    {
      key: "samples",
      label: "Samples",
      type: "number",
      default: 100,
      showIf: { "!=": [{ var: "path" }, ""] },
      hint: "How many evenly-spaced elevations to take along the path.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Elevations, in request order" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "minElevation", type: "number", label: "Lowest, in metres" },
    { key: "maxElevation", type: "number", label: "Highest, in metres" },
    { key: "worstResolution", type: "number", label: "Coarsest sample spacing, in metres" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const rawLocations = String(p.locations ?? "").trim();
    const rawPath = String(p.path ?? "").trim();
    if (!rawLocations && !rawPath) throw new Error("give `locations` or a `path`");
    if (rawLocations && rawPath) {
      throw new Error(
        "give either `locations` or a `path`, not both — Google takes one or the other",
      );
    }

    const parameters: Record<string, unknown> = {};
    if (rawLocations) {
      parameters.locations = latLngPath(rawLocations, "locations").map(pointString).join("|");
    } else {
      parameters.path = latLngPath(rawPath, "path").map(pointString).join("|");
      parameters.samples = Math.max(1, Number(p.samples ?? 100));
    }

    const body = await new MapsClient(ctx).legacy<{
      status?: string;
      results?: Array<{ elevation?: number; resolution?: number }>;
    }>("/elevation/json", query(parameters), "Elevation API");

    const results = body.results ?? [];
    const elevations = results.map((r) => Number(r?.elevation ?? 0));
    const resolutions = results.map((r) => Number(r?.resolution ?? 0)).filter((n) =>
      Number.isFinite(n) && n > 0
    );

    return {
      results,
      count: results.length,
      minElevation: elevations.length ? Math.min(...elevations) : undefined,
      maxElevation: elevations.length ? Math.max(...elevations) : undefined,
      // The coarsest, because it is the one that limits what the answer means.
      worstResolution: resolutions.length ? Math.max(...resolutions) : undefined,
    };
  },
};

export default action;
