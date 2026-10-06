import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, compact, encodeId } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  jobId: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

const action: ActionDefinition<Input> = {
  key: "job-update-address",
  type: "perform",
  resource: "job",
  title: "Update Job Address",
  description: "Update a job's location address. Only the fields you send are changed.",
  idempotent: true,
  params: [
    idParam("jobId", "Job id"),
    { key: "street1", label: "Street", type: "string" },
    { key: "street2", label: "Street 2", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State", type: "string", hint: "State or province code, e.g. MI." },
    { key: "country", label: "Country", type: "string", hint: "ISO 3166-1 alpha-2 code, e.g. US." },
    { key: "zipCode", label: "ZIP / postal code", type: "string" },
  ],
  output: [{
    key: "success",
    type: "boolean",
    label: "True when AccuLynx accepted the request (it answers with no body)",
  }],

  async execute(input, ctx) {
    const { jobId, ...fields } = input;
    const body = compact(fields);
    if (Object.keys(body).length === 0) {
      throw new Error("give at least one address field to change");
    }
    return await new AccuLynxClient(ctx).send(`/jobs/${encodeId(jobId)}/address`, {
      method: "PUT",
      body,
    });
  },
};

export default action;
