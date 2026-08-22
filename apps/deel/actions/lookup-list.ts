import type { ActionDefinition } from "@w6w/types";
import { DeelClient } from "../lib/client.ts";

/**
 * The `/lookups/*` collection — verified against Deel's own OpenAPI document
 * (`endpoints.json`: `get-countries`, `get-currencies`, `get-job-titles`,
 * `get-seniority-levels`, `get-time-off-types`).
 *
 * Five endpoints with one shape and one purpose: resolving the ids Deel's write
 * endpoints demand. They are folded into a single action rather than five
 * near-identical ones, because "which list" is a parameter, not a different
 * operation — and the alternative is five actions a workflow author has to
 * scroll past.
 */
const LOOKUPS: Record<string, string> = {
  countries: "/lookups/countries",
  currencies: "/lookups/currencies",
  "job-titles": "/lookups/job-titles",
  seniorities: "/lookups/seniorities",
  "time-off-types": "/lookups/time-off-types",
};

const action: ActionDefinition = {
  key: "lookup-list",
  type: "read",
  resource: "lookup",
  title: "List a lookup",
  description: "Read one of Deel's reference lists — countries, currencies, job titles, and so on.",
  params: [
    {
      key: "lookup",
      label: "Lookup",
      type: "select",
      required: true,
      default: "countries",
      options: [
        { value: "countries", label: "Countries" },
        { value: "currencies", label: "Currencies" },
        { value: "job-titles", label: "Job titles" },
        { value: "seniorities", label: "Seniority levels" },
        { value: "time-off-types", label: "Time-off types" },
      ],
    },
  ],
  output: [{ key: "data", type: "array", label: "Entries" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const lookup = String(p.lookup ?? "").trim();
    const path = LOOKUPS[lookup];
    if (!path) {
      // Named rather than sent, so a typo does not become a 404 on a URL the
      // caller never wrote.
      throw new Error(
        `unknown lookup "${lookup}" — one of ${Object.keys(LOOKUPS).join(", ")}`,
      );
    }

    ctx.log("info", "listing a Deel lookup", { lookup });
    return await new DeelClient(ctx).request(path);
  },
};

export default action;
