import type { Param } from "@w6w/types";
import { boundedList } from "../lib/triggers.ts";
import propertyImagesList from "../actions/property-images-list.ts";

const PROPERTY_ID: Param = {
  key: "propertyId",
  label: "Property UUID",
  type: "string",
  required: true,
  hint: "The property to watch (from List Properties).",
};

export default boundedList({
  key: "new-property-image",
  title: "New Property Image",
  description: "The run gets each image newly added to one property.",
  action: propertyImagesList as never,
  paged: false,
  params: [PROPERTY_ID],
  input: (params) => ({ uuid: String(params.propertyId).trim() }),
  output: [
    { key: "url", type: "string", label: "Image URL" },
    { key: "caption", type: "string", label: "Caption" },
  ],
  sample: { id: "image-1", url: "https://example.com/image-1.jpg", caption: "Living room" },
});
