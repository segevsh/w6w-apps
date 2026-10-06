import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  uploadToken: string;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  extra?: Record<string, unknown>;
}

const uploadMedia: ActionDefinition<Input> = {
  key: "upload-media",
  type: "perform",
  idempotent: false,
  resource: "media",
  title: "Upload Media",
  description:
    "Step 3 of 3 of an Eventbrite image upload: finalizes the upload and creates the media record, returning its ID. Before calling it, run Get Media Upload Instructions, then upload the file to the storage URL it returns (a step this app does not perform), and pass the same upload token here. An optional crop window can be applied. Creates a media item on Eventbrite.",
  params: [
    {
      key: "uploadToken",
      label: "Upload token",
      type: "string",
      required: true,
      hint: "The upload_token returned by Get Media Upload Instructions.",
    },
    { key: "cropX", label: "Crop X (top-left)", type: "number", advanced: true },
    { key: "cropY", label: "Crop Y (top-left)", type: "number", advanced: true },
    { key: "cropWidth", label: "Crop width", type: "number", advanced: true },
    { key: "cropHeight", label: "Crop height", type: "number", advanced: true },
    { key: "extra", label: "Additional fields", type: "json" },
  ],
  output: [
    { key: "id", type: "string", label: "Media ID" },
    { key: "url", type: "string", label: "Image URL" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const body: Record<string, unknown> = { upload_token: input.uploadToken };
    const crop: Record<string, unknown> = {};
    if (input.cropX !== undefined || input.cropY !== undefined) {
      const top_left: Record<string, number> = {};
      if (input.cropX !== undefined) top_left.x = input.cropX;
      if (input.cropY !== undefined) top_left.y = input.cropY;
      crop.top_left = top_left;
    }
    if (input.cropWidth !== undefined) crop.width = input.cropWidth;
    if (input.cropHeight !== undefined) crop.height = input.cropHeight;
    if (Object.keys(crop).length > 0) body.crop_mask = crop;
    Object.assign(body, input.extra ?? {});
    return client.request("/media/upload/", { method: "POST", body });
  },
};

export default uploadMedia;
