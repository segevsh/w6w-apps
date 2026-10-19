import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  fileUploadId: string;
}

/** POST /v1/file_uploads/{file_upload_id}/complete — complete-file-upload. */
const action: ActionDefinition<Input> = {
  key: "complete-file-upload",
  type: "perform",
  resource: "fileUpload",
  title: "Complete File Upload",
  description: "Complete a multi-part file upload.",
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
    "key": "fileUploadId",
    "label": "File Upload ID",
    "type": "string",
    "required": true,
    "hint": "Identifier for a Notion file upload object.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/file_uploads/${pathId(input.fileUploadId)}/complete`, {
      method: "POST",
    });
  },
};

export default action;
