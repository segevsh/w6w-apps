import type { ActionDefinition } from "@w6w/types";
import { compact, HOSTS, json, MapsClient } from "../lib/client.ts";

/**
 * `POST www.googleapis.com/geolocation/v1/geolocate` — where a device is, from
 * the cell towers and wifi it can see.
 *
 * ## A 404 means "I could not work it out", not "the endpoint is missing"
 *
 * This is the one genuinely surprising thing about this API, and it is
 * documented: when Google cannot geolocate the request it answers **HTTP 404
 * with `reason: "notFound"`**. Fewer than two usable wifi access points,
 * filtered MAC addresses, a signal strength above -10 dBm, or cell data with no
 * fallback — all of them come back as a 404.
 *
 * Anything treating a 404 as a broken URL will report an infrastructure problem
 * for what is really "not enough signal". This action turns it into
 * `located: false` with an explanation, which is the answer the caller asked
 * for.
 *
 * ## `considerIp` decides whether an answer is meaningful
 *
 * It defaults to **true**, and with no towers or access points given, that
 * means the API geolocates the *caller* — which, from a workflow runner, is a
 * datacentre. A confident latitude and longitude with an accuracy of several
 * thousand metres, pointing at wherever the request came from. It is a real
 * answer to a question nobody asked, so this action returns `accuracy` and
 * `usedIpFallback` prominently rather than just a point.
 */
const action: ActionDefinition = {
  key: "geolocate",
  type: "search",
  resource: "geolocation",
  title: "Geolocate from signals",
  description:
    "Where a device is, from the cell towers and wifi around it. Google answers HTTP 404 when it " +
    "cannot tell — that is 'not enough signal', not a broken URL, and it is reported as such.",
  params: [
    {
      key: "wifiAccessPoints",
      label: "Wifi Access Points",
      type: "json",
      default: "",
      hint: 'JSON array, e.g. [{"macAddress":"00:25:9c:cf:1c:ac","signalStrength":-43}]. Google ' +
        "needs at least TWO to answer from wifi alone.",
    },
    {
      key: "cellTowers",
      label: "Cell Towers",
      type: "json",
      default: "",
      hint: 'JSON array, e.g. [{"cellId":42,"locationAreaCode":415,"mobileCountryCode":310,' +
        '"mobileNetworkCode":410}].',
    },
    {
      key: "considerIp",
      label: "Fall Back To IP",
      type: "boolean",
      default: false,
      hint: "Google's own default is ON, which — with no signals given — geolocates whatever " +
        "machine ran this workflow. Off here, so an answer means what it says.",
    },
    {
      key: "radioType",
      label: "Radio Type",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "Unspecified" },
        { value: "gsm", label: "gsm" },
        { value: "cdma", label: "cdma" },
        { value: "wcdma", label: "wcdma" },
        { value: "lte", label: "lte" },
        { value: "nr", label: "nr (5G)" },
      ],
    },
    { key: "carrier", label: "Carrier", type: "string", default: "", advanced: true },
  ],
  output: [
    { key: "located", type: "boolean", label: "Whether Google could place it" },
    { key: "location", type: "object", label: "lat/lng" },
    { key: "accuracy", type: "number", label: "Radius in metres — read this before the point" },
    {
      key: "usedIpFallback",
      type: "boolean",
      label: "The answer may be the caller's own location",
    },
    { key: "reason", type: "string", label: "Why not, when not" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const wifi = json(p.wifiAccessPoints, "wifiAccessPoints") as unknown[] | undefined;
    const cells = json(p.cellTowers, "cellTowers") as unknown[] | undefined;
    const considerIp = p.considerIp === true;

    if (!considerIp && (wifi?.length ?? 0) === 0 && (cells?.length ?? 0) === 0) {
      throw new Error(
        "give `wifiAccessPoints` or `cellTowers` — with neither, and IP fallback off, there is " +
          "nothing to locate. Turning IP fallback on would locate the machine running this " +
          "workflow, which is a datacentre",
      );
    }

    const body = compact({
      considerIp,
      wifiAccessPoints: wifi,
      cellTowers: cells,
      radioType: p.radioType,
      carrier: p.carrier,
    });

    try {
      const result = await new MapsClient(ctx).rpc<{
        location?: { lat?: number; lng?: number };
        accuracy?: number;
      }>(HOSTS.geolocation, "/geolocation/v1/geolocate", { method: "POST", body });

      const usedIpFallback = considerIp && (wifi?.length ?? 0) === 0 && (cells?.length ?? 0) === 0;
      ctx.log("info", "geolocated from signals", {
        accuracy: result?.accuracy,
        usedIpFallback,
      });
      return {
        located: true,
        location: result?.location,
        accuracy: result?.accuracy,
        usedIpFallback,
      };
    } catch (err) {
      const message = String(err);
      // A 404 here is the documented "I could not work it out", not a missing route.
      if (/\b404\b/.test(message)) {
        return {
          located: false,
          reason: "Google could not place these signals — usually fewer than two usable wifi " +
            "access points, MAC addresses it filters (broadcast or IANA-reserved), or cell data " +
            "with no fallback. This is an answer, not a failure",
        };
      }
      throw err;
    }
  },
};

export default action;
