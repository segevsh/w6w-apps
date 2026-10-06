import type { ActionDefinition } from "@w6w/types";
import { PdlClient, pick } from "../lib/client.ts";
import {
  pdlIdParam,
  PERSON_MATCH_HINT,
  PERSON_MATCH_KEYS,
  personEnrichOptionParams,
  personMatchParams,
  sandboxParam,
} from "../lib/params.ts";

type Input = Record<string, unknown>;

export const ENRICH_KEYS = [
  "pdl_id",
  ...PERSON_MATCH_KEYS,
  "min_likelihood",
  "required",
  "data_include",
  "include_if_matched",
  "titlecase",
] as const;

const enrichPerson: ActionDefinition<Input> = {
  key: "enrich-person",
  type: "read",
  resource: "person",
  title: "Enrich Person",
  description:
    `One-to-one person match: returns the full PDL profile for the person your inputs identify. ${PERSON_MATCH_HINT} Costs one credit per match. No match is a normal outcome (found: false), not an error.`,
  params: [pdlIdParam, ...personMatchParams, ...personEnrichOptionParams, sandboxParam],
  output: [
    { key: "found", type: "boolean", label: "True when PDL returned a match" },
    { key: "status", type: "number", label: "PDL status (200 match, 404 no match)" },
    { key: "likelihood", type: "number", label: "Match confidence, 1-10" },
    { key: "data", type: "object", label: "The person profile (PDL person schema)" },
    { key: "matched", type: "array", label: "Inputs that matched (with include_if_matched)" },
    { key: "error", type: "object", label: "PDL's not_found error, when found is false" },
  ],

  async execute(input, ctx) {
    return await new PdlClient(ctx).request("GET", "/v5/person/enrich", {
      query: pick(input, ENRICH_KEYS),
      sandbox: input.sandbox === true,
      notFound: {},
    });
  },
};

export default enrichPerson;
