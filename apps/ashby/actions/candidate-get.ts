import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact } from "../lib/client.ts";

/**
 * `POST /candidate.info` — one candidate, by Ashby id or by **your** id.
 *
 * `externalMappingId` is the parameter worth knowing about. It is an id
 * assigned outside Ashby and stored on the candidate, which means a workflow
 * that already knows somebody by its own key does not have to keep an Ashby id
 * beside it — the lookup goes the other way. That is the difference between a
 * two-way integration and a mapping table nobody maintains.
 *
 * Exactly one of the two is needed; sending neither returns the wrong thing
 * rather than an error, so this refuses first.
 */
const action: ActionDefinition = {
  key: "candidate-get",
  type: "read",
  resource: "candidate",
  title: "Get a candidate",
  description:
    "One candidate, by Ashby id or by an id your own system assigned — the second removes the " +
    "need for a mapping table nobody maintains.",
  params: [
    { key: "candidateId", label: "Candidate ID", type: "string", default: "" },
    {
      key: "externalMappingId",
      label: "External Mapping ID",
      type: "string",
      default: "",
      hint: "An id assigned outside Ashby and stored on the candidate.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Candidate ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "applicationIds", type: "array", label: "Their applications" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.candidateId ?? "").trim();
    const externalMappingId = String(p.externalMappingId ?? "").trim();
    if (!id && !externalMappingId) {
      throw new Error("give a `candidateId` or an `externalMappingId`");
    }

    return await new AshbyClient(ctx).request("candidate.info", {
      body: compact({ id, externalMappingId }),
    });
  },
};

export default action;
