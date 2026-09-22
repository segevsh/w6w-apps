import type { ActionDefinition } from "@w6w/types";
import { SmartSuiteClient } from "../lib/client.ts";

interface Input {
  recordId: string;
}

/**
 * `GET /comments/?record={recordId}` — every comment on a record.
 *
 * `record` is a required query parameter, and the response is a **bare array**
 * of comment objects (each with its own id, author, SmartDoc `message`, and
 * any `assigned_to`). Comments are addressed by record id alone — there is no
 * table segment in the path.
 */
const listComments: ActionDefinition<Input, unknown[]> = {
  key: "list-comments",
  type: "read",
  resource: "comment",
  title: "List Comments",
  description: "List the comments on a SmartSuite record (GET /comments/?record={recordId}).",
  params: [
    {
      key: "recordId",
      label: "Record ID",
      type: "string",
      required: true,
      hint: "The `id` of the record whose comments to read.",
    },
  ],
  output: [
    { key: "[]", type: "array", label: "Comments — a bare array, not an envelope" },
  ],

  async execute(input, ctx) {
    const comments = await new SmartSuiteClient(ctx).request<unknown[]>("comments/", {
      query: { record: input.recordId },
    });
    return Array.isArray(comments) ? comments : [];
  },
};

export default listComments;
