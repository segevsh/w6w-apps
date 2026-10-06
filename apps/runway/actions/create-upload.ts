import type { ActionDefinition } from "@w6w/types";
import { need, RunwayClient } from "../lib/client.ts";

interface Input {
  filename: string;
}

/**
 * `POST /v1/uploads` with `type: "ephemeral"`. The response is a presigned form: `uploadUrl`
 * plus `fields` that the CALLER must POST (multipart) together with the file, after which
 * `runwayUri` (`runway://…`) can be used in a generation's media input. The upload itself goes
 * to the vendor's storage host, which this app does not call — see the README.
 */
const createUpload: ActionDefinition<Input> = {
  key: "create-upload",
  type: "perform",
  idempotent: false,
  resource: "upload",
  title: "Create Upload",
  description: "Create an ephemeral upload slot. Returns the presigned upload form and the " +
    "runway:// URI to use as media input once the file has been POSTed to it.",
  params: [{
    key: "filename",
    label: "Filename",
    type: "string",
    required: true,
    validation: { minLength: 3, maxLength: 255 },
    hint: "e.g. input.mp4 (3-255 characters).",
  }],
  output: [
    { key: "uploadUrl", type: "string", label: "Presigned URL to POST the file to" },
    { key: "fields", type: "object", label: "Form fields to send with the file" },
    { key: "runwayUri", type: "string", label: "runway:// URI to pass as media input" },
  ],

  async execute(input, ctx) {
    const { data } = await new RunwayClient(ctx).request("/v1/uploads", {
      method: "POST",
      body: { filename: need(input.filename, "filename"), type: "ephemeral" },
    });
    const d = (data ?? {}) as { uploadUrl?: string; fields?: unknown; runwayUri?: string };
    return { uploadUrl: d.uploadUrl, fields: d.fields, runwayUri: d.runwayUri };
  },
};

export default createUpload;
