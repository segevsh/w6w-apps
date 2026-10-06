import type { ActionDefinition } from "@w6w/types";
import { FireberryClient, jsonValue, seg } from "../lib/client.ts";
import { OBJECT_NUMBER_PARAM } from "../lib/params.ts";

interface Input {
  objectNumber: number;
  records: Array<Record<string, unknown>> | string;
}

/** `POST /api/v3/record/{objectcode}/batch/create`. */
const recordsBatchCreate: ActionDefinition<Input> = {
  key: "records-batch-create",
  type: "perform",
  resource: "record",
  title: "Batch Create Records",
  description:
    "Create up to 20 records of one object in a single call. Records with invalid data are skipped while the valid ones are still created, so inspect the result. Not available on every licence.",
  idempotent: false,
  params: [
    OBJECT_NUMBER_PARAM,
    {
      key: "records",
      label: "Records",
      type: "json",
      required: true,
      hint: "Array of up to 20 objects, each keyed by system field name.",
    },
  ],
  output: [{ key: "result", type: "object", label: "Fireberry's response body, verbatim" }],

  async execute(input, ctx) {
    const records = jsonValue(input.records);
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error("records must be a non-empty JSON array of objects");
    }
    if (records.length > 20) throw new Error("Fireberry batch calls accept at most 20 records");
    const result = await new FireberryClient(ctx).request(
      "POST",
      `/api/v3/record/${seg(input.objectNumber)}/batch/create`,
      { body: { data: records } },
    );
    return { result };
  },
};

export default recordsBatchCreate;
