import type { ActionDefinition } from "@w6w/types";
import { PdlClient, pick } from "../lib/client.ts";
import {
  dataIncludeParam,
  PERSON_MATCH_KEYS,
  personMatchParams,
  sandboxParam,
  titlecaseParam,
} from "../lib/params.ts";

type Input = Record<string, unknown>;

const KEYS = [...PERSON_MATCH_KEYS, "data_include", "include_if_matched", "titlecase"] as const;

const identifyPerson: ActionDefinition<Input> = {
  key: "identify-person",
  type: "search",
  resource: "person",
  title: "Identify Person",
  description:
    "One-to-many person match: returns up to 20 candidate profiles ranked by match score (1-99) for loose inputs such as a name and a city. Needs at least one input. Costs one credit per call whatever the number of profiles returned, including a no-match. No match is found: false, not an error.",
  params: [
    ...personMatchParams,
    dataIncludeParam("person"),
    {
      key: "include_if_matched",
      label: "Report matched inputs",
      type: "boolean",
      default: false,
      hint: "Adds matched_on to each candidate, naming which inputs matched it.",
    },
    titlecaseParam,
    sandboxParam,
  ],
  output: [
    { key: "found", type: "boolean", label: "True when PDL returned candidates" },
    { key: "status", type: "number", label: "PDL status (200 match, 404 no match)" },
    {
      key: "matches",
      type: "array",
      label: "Up to 20 {match_score, data, matched_on?} candidates, best first",
    },
  ],

  async execute(input, ctx) {
    return await new PdlClient(ctx).request("GET", "/v5/person/identify", {
      query: pick(input, KEYS),
      sandbox: input.sandbox === true,
      notFound: { matches: [] },
    });
  },
};

export default identifyPerson;
