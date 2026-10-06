import type { ActionDefinition } from "@w6w/types";
import { encodeId, HospitableClient } from "../lib/client.ts";

/** `GET /v2/properties/{uuid}/images` — Images scoped to the Direct channel. */
interface Input {
  uuid: string;
}

const propertyImagesList: ActionDefinition<Input> = {
  key: "property-images-list",
  type: "read",
  resource: "property",
  title: "List Property Images",
  description:
    "List a property's images (url, thumbnail, caption, order). Only images scoped to the Direct channel are returned.",
  params: [{ key: "uuid", label: "Property UUID", type: "string", required: true }],
  output: [{ key: "data", type: "array", label: "Images" }],

  execute(input, ctx) {
    return new HospitableClient(ctx).request("GET", `/properties/${encodeId(input.uuid)}/images`);
  },
};

export default propertyImagesList;
