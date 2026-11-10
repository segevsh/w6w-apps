import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import imageGetMany from "../actions/image-get-many.ts";
import { idOf } from "../lib/lists.ts";

/**
 * Newest-first by documentation: "Images are listed in reverse-chronological order based on the
 * date you added them to your account" (https://www.typeform.com/developers/create/reference/retrieve-images-collection/,
 * 2026-11-10). The endpoint returns a bare array.
 */
export default pollFromListAction<Record<string, never>>({
  key: "new-image",
  title: "New Image",
  description:
    "Fires when an image is added to the Typeform account's image library. The run gets the image's id, file name, URL and upload source.",
  action: imageGetMany as unknown as ActionDefinition,
  input: () => ({}),
  items: (result) => (Array.isArray(result) ? result : []),
  idOf: (item) => idOf(item, "image"),
  output: [
    { key: "id", type: "string", label: "Image ID" },
    { key: "file_name", type: "string", label: "File name" },
    { key: "src", type: "string", label: "URL" },
    { key: "upload_source", type: "string", label: "Upload source" },
  ],
  sample: {
    id: "ImgAbC1",
    file_name: "logo.png",
    src: "https://api.typeform.com/images/ImgAbC1",
    upload_source: "api",
  },
});
