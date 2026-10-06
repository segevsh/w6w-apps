import type { ActionDefinition } from "@w6w/types";
import { PdlClient, pick } from "../lib/client.ts";
import { titlecaseParam } from "../lib/params.ts";

type Input = Record<string, unknown>;

const bool = (key: string, label: string, hint: string) => ({
  key,
  label,
  type: "boolean" as const,
  default: false,
  hint,
});

const enrichIp: ActionDefinition<Input> = {
  key: "enrich-ip",
  type: "read",
  resource: "ip",
  title: "Enrich IP Address",
  description:
    "Resolve an IPv4 or IPv6 address to the company (and optionally the person, location and network metadata) PDL associates with it. Costs one credit per match. No match is a normal outcome (found: false), not an error.",
  params: [
    {
      key: "ip",
      label: "IP address",
      type: "string",
      required: true,
      placeholder: "72.212.42.169",
    },
    bool("return_ip_location", "Return IP location", "Include the IP's own location data."),
    bool(
      "return_ip_metadata",
      "Return IP metadata",
      "Include network metadata (hosting, proxy, VPN, tor...).",
    ),
    bool(
      "return_if_unmatched",
      "Return data without a company match",
      "Return the location/metadata even when no company matched.",
    ),
    bool("return_person", "Return person", "Include person fields associated with the IP."),
    {
      key: "min_confidence",
      label: "Minimum confidence",
      type: "string",
      hint:
        "Only return company/person results at or above this confidence: very high, high, moderate, low or very low.",
    },
    titlecaseParam,
  ],
  output: [
    { key: "found", type: "boolean", label: "True when PDL returned a match" },
    { key: "status", type: "number", label: "PDL status (200 match, 404 no match)" },
    { key: "data", type: "object", label: "{ ip, company, person, location } record" },
  ],

  async execute(input, ctx) {
    if (typeof input.ip !== "string" || input.ip.trim() === "") {
      throw new Error("ip is required.");
    }
    return await new PdlClient(ctx).request("GET", "/v5/ip/enrich", {
      query: pick(input, [
        "ip",
        "return_ip_location",
        "return_ip_metadata",
        "return_if_unmatched",
        "return_person",
        "min_confidence",
        "titlecase",
      ]),
      notFound: {},
    });
  },
};

export default enrichIp;
