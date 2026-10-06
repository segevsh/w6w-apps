import {
  ENRICH_FLAGS,
  type EnrichFlags,
  enrichFlags,
  PERSON_FIELDS,
  personData,
  type PersonInput,
  ProspeoClient,
} from "../lib/client.ts";
import type { ActionDefinition } from "@w6w/types";

type Input = PersonInput & EnrichFlags;

const enrichPerson: ActionDefinition<Input> = {
  key: "enrich-person",
  type: "perform",
  resource: "person",
  title: "Enrich Person",
  description:
    "Identify one person and return their profile, company and verified work email (POST /enrich-person). 1 credit per email found, 10 per mobile; no charge for no match or a repeat within 90 days. Returns `matched: false` on NO_MATCH.",
  // Re-enriching the same record within 90 days is free, so a retry cannot double-charge.
  idempotent: true,
  params: [...PERSON_FIELDS, ...ENRICH_FLAGS],
  output: [
    { key: "matched", type: "boolean", label: "Whether a person was matched" },
    { key: "free_enrichment", type: "boolean", label: "True if no credit was charged" },
    { key: "person", type: "object", label: "Person object (email, mobile, jobs, location)" },
    { key: "company", type: "object", label: "Current company object (null if none)" },
    { key: "error_code", type: "string", label: "Set when nothing matched" },
  ],

  async execute(input, ctx) {
    const data = personData(input);
    if (Object.keys(data).length === 0) {
      throw new Error("give at least one identifying field (e.g. LinkedIn URL, or name + company)");
    }
    const body = await new ProspeoClient(ctx).call<Record<string, unknown>>("/enrich-person", {
      body: { ...enrichFlags(input), data },
      soft: ["NO_MATCH"],
    });
    if (body.error === true) return { matched: false, error_code: body.error_code };
    return {
      matched: true,
      free_enrichment: body.free_enrichment,
      person: body.person,
      company: body.company ?? null,
    };
  },
};

export default enrichPerson;
