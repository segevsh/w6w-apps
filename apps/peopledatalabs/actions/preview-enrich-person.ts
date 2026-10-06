import type { ActionDefinition } from "@w6w/types";
import { PdlClient, pick } from "../lib/client.ts";
import {
  pdlIdParam,
  PERSON_MATCH_HINT,
  personEnrichOptionParams,
  personMatchParams,
} from "../lib/params.ts";
import { ENRICH_KEYS } from "./enrich-person.ts";

type Input = Record<string, unknown>;

const previewEnrichPerson: ActionDefinition<Input> = {
  key: "preview-enrich-person",
  type: "read",
  resource: "person",
  title: "Preview Person Enrichment",
  description:
    `Preview which fields PDL holds for a person (true/false per field, with only a few identifying fields in clear) before paying for the full enrichment. Same inputs as Enrich Person. ${PERSON_MATCH_HINT} Needs preview access on the API key.`,
  params: [pdlIdParam, ...personMatchParams, ...personEnrichOptionParams],
  output: [
    { key: "found", type: "boolean", label: "True when PDL returned a match" },
    { key: "status", type: "number", label: "PDL status (200 match, 404 no match)" },
    { key: "likelihood", type: "number", label: "Match confidence, 1-10" },
    { key: "data", type: "object", label: "Field-availability preview of the person" },
  ],

  async execute(input, ctx) {
    return await new PdlClient(ctx).request("GET", "/v5/person/enrich/preview", {
      query: pick(input, ENRICH_KEYS),
      notFound: {},
    });
  },
};

export default previewEnrichPerson;
