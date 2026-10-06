import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  type: string;
}

const getMediaUpload: ActionDefinition<Input> = {
  key: "get-media-upload",
  type: "read",
  resource: "media",
  title: "Get Media Upload Instructions",
  description:
    "Step 1 of 3 of an Eventbrite image upload. Returns the upload instructions (storage URL, form fields and an upload token) for the chosen image type. Step 2, which this app does not perform, is uploading the file bytes to the returned storage URL. Step 3 is the Upload Media action, which finalizes the upload with the upload token and returns the media ID.",
  idempotent: true,
  params: [
    {
      key: "type",
      label: "Image type",
      type: "select",
      required: true,
      default: "image-event-logo",
      options: [
        { value: "image-event-logo", label: "Event logo" },
        { value: "image-event-logo-preserve-quality", label: "Event logo (preserve quality)" },
        { value: "image-event-view-from-seat", label: "Event view from seat" },
        { value: "image-organizer-logo", label: "Organizer logo" },
        { value: "image-user-photo", label: "User photo" },
        { value: "image-structured-content", label: "Structured content" },
      ],
    },
  ],
  output: [
    { key: "upload_url", type: "string", label: "Storage upload URL" },
    { key: "upload_data", type: "object", label: "Form fields to send to the storage URL" },
    { key: "file_parameter_name", type: "string", label: "File field name" },
    { key: "upload_token", type: "string", label: "Upload token" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request("/media/upload/", { query: { type: input.type } });
  },
};

export default getMediaUpload;
