import type { ActionDefinition, Param } from "@w6w/types";
import { RocketReachClient } from "../lib/client.ts";
import {
  LOOKUP_ASYNC,
  LOOKUP_IDENTITY,
  lookupQuery,
  PROFILE_OUTPUT,
  profileOutput,
} from "../lib/profile.ts";

type Input = Record<string, unknown>;

const reveal = (key: string, label: string, hint: string): Param => ({
  key,
  label,
  type: "boolean",
  default: false,
  hint,
});

/**
 * `GET /universal/person/lookup` — Universal Credits accounts only. Each data type
 * is revealed, and charged, only when its `reveal_*` flag is true; the fields are
 * absent from the response otherwise.
 */
const universalLookupPerson: ActionDefinition<Input> = {
  key: "universal-lookup-person",
  type: "read",
  resource: "person",
  title: "Universal Lookup Person",
  description: "Universal Credits version of Lookup Person. Choose what to reveal: professional " +
    "email (2 credits), personal email (3), phone (6), detailed enrichment of job history, " +
    "education, skills and links (1), healthcare enrichment (1). Nothing is revealed or charged " +
    "unless its flag is on. May still be running (complete: false): poll Universal Check Lookup " +
    "Status.",
  params: [
    ...LOOKUP_IDENTITY,
    reveal("reveal_professional_email", "Reveal professional email", "2 credits when found."),
    reveal("reveal_personal_email", "Reveal personal email", "3 credits when found."),
    reveal("reveal_phone", "Reveal phone", "6 credits when found."),
    reveal(
      "reveal_detailed_person_enrichment",
      "Reveal detailed enrichment",
      "Job history, education, skills and social links; 1 credit.",
    ),
    reveal(
      "reveal_healthcare_enrichment",
      "Reveal healthcare enrichment",
      "NPI, license, specialization and credentials; 1 credit.",
    ),
    ...LOOKUP_ASYNC,
  ],
  output: PROFILE_OUTPUT,

  async execute(input, ctx) {
    const query: Record<string, unknown> = lookupQuery(input);
    for (
      const k of [
        "reveal_professional_email",
        "reveal_personal_email",
        "reveal_phone",
        "reveal_detailed_person_enrichment",
        "reveal_healthcare_enrichment",
      ]
    ) {
      if (typeof input[k] === "boolean") query[k] = input[k];
    }
    const { body } = await new RocketReachClient(ctx).request("/universal/person/lookup", {
      query,
    });
    return profileOutput(body);
  },
};

export default universalLookupPerson;
