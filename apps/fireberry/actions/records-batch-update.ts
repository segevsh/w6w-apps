import type { ActionDefinition } from "@w6w/types";
import { FireberryClient, jsonValue, seg } from "../lib/client.ts";
import { OBJECT_NUMBER_PARAM } from "../lib/params.ts";

interface Input {
  objectNumber: number;
  updates: Array<{ id: string; record: Record<string, unknown> }> | string;
}

/** `POST /api/v3/record/{objectcode}/batch/update`. */
const recordsBatchUpdate: ActionDefinition<Input> = {
  key: "records-batch-update",
  type: "perform",
  resource: "record",
  title: "Batch Update Records",
  description:
    "Update up to 20 records of one object in a single call. Records with invalid data are skipped while the valid ones are still updated, so inspect the result. Not available on every licence.",
  idempotent: true,
  params: [
    OBJECT_NUMBER_PARAM,
    {
      key: "updates",
      label: "Updates",
      type: "json",
      required: true,
      hint:
        'Array of up to 20 entries shaped {"id": "<record GUID>", "record": {"<field>": <value>}}.',
    },
  ],
  output: [{ key: "result", type: "object", label: "Fireberry's response body, verbatim" }],

  async execute(input, ctx) {
    const updates = jsonValue(input.updates);
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error("updates must be a non-empty JSON array of {id, record} objects");
    }
    if (updates.length > 20) throw new Error("Fireberry batch calls accept at most 20 records");
    const result = await new FireberryClient(ctx).request(
      "POST",
      `/api/v3/record/${seg(input.objectNumber)}/batch/update`,
      { body: { data: updates } },
    );
    return { result };
  },
};

export default recordsBatchUpdate;
