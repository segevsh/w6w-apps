import type { ActionDefinition } from "@w6w/types";
import { FireberryClient, seg } from "../lib/client.ts";
import { OBJECT_PARAM } from "../lib/params.ts";

interface Input {
  object: string;
  recordId: string;
}

/** `GET /api/record/{object}/{id}`. */
const recordGet: ActionDefinition<Input> = {
  key: "record-get",
  type: "read",
  resource: "record",
  title: "Get Record",
  description: "Fetch one record of any object by its GUID, with all its fields.",
  params: [
    OBJECT_PARAM,
    {
      key: "recordId",
      label: "Record ID",
      type: "string",
      required: true,
      hint: "The record's GUID.",
    },
  ],
  output: [{ key: "record", type: "object", label: "The record and its field values" }],

  async execute(input, ctx) {
    const body = await new FireberryClient(ctx).request<{ data?: { Record?: unknown } }>(
      "GET",
      `/api/record/${seg(input.object)}/${seg(input.recordId)}`,
    );
    return { record: body.data?.Record ?? null };
  },
};

export default recordGet;
