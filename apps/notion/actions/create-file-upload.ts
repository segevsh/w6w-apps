import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  mode?: "single_part" | "multi_part" | "external_url";
  filename?: string;
  contentType?: string;
  numberOfParts?: number;
  externalUrl?: string;
}

/** POST /v1/file_uploads — create-file. */
const action: ActionDefinition<Input> = {
  key: "create-file-upload",
  type: "perform",
  resource: "fileUpload",
  title: "Create File Upload",
  description: "Create a file upload.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "created_time", "type": "string", "label": "Created time" },
    { "key": "created_by", "type": "object", "label": "Created by" },
    { "key": "last_edited_time", "type": "string", "label": "Last edited time" },
    { "key": "in_trash", "type": "boolean", "label": "In trash" },
    { "key": "expiry_time", "type": "object", "label": "Expiry time" },
    { "key": "status", "type": "string", "label": "Status" },
    { "key": "filename", "type": "object", "label": "Filename" },
    { "key": "content_type", "type": "object", "label": "Content type" },
    { "key": "content_length", "type": "object", "label": "Content length" },
    { "key": "upload_url", "type": "string", "label": "Upload url" },
    { "key": "complete_url", "type": "string", "label": "Complete url" },
    { "key": "file_import_result", "type": "object", "label": "File import result" },
    { "key": "number_of_parts", "type": "object", "label": "Number of parts" },
  ],
  idempotent: false,
  params: [{
    "key": "mode",
    "label": "Mode",
    "type": "select",
    "options": [{ "value": "single_part", "label": "single_part" }, {
      "value": "multi_part",
      "label": "multi_part",
    }, { "value": "external_url", "label": "external_url" }],
    "hint":
      "How the file is sent. Defaults to single_part. Use multi_part for files larger than 20 MiB or external_url for a temporary public HTTPS URL.",
  }, {
    "key": "filename",
    "label": "Filename",
    "type": "string",
    "hint":
      "The filename. Required for multi_part and external_url uploads. Include an extension or provide content_type so one can be inferred.",
  }, {
    "key": "contentType",
    "label": "Content Type",
    "type": "string",
    "hint": "The MIME type. It must match the uploaded file and any filename extension.",
  }, {
    "key": "numberOfParts",
    "label": "Number Of Parts",
    "type": "number",
    "hint":
      "The number of parts in a multi_part upload. Required only for multi_part uploads. This must match the number of uploaded parts and the final part_number sent.",
    "validation": { "min": 1, "max": 10000, "integer": true },
  }, {
    "key": "externalUrl",
    "label": "External URL",
    "type": "string",
    "hint": "A public HTTPS URL to import. Required only for external_url uploads.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/file_uploads`, {
      method: "POST",
      body: {
        "mode": input.mode,
        "filename": input.filename,
        "content_type": input.contentType,
        "number_of_parts": input.numberOfParts,
        "external_url": input.externalUrl,
      },
    });
  },
};

export default action;
