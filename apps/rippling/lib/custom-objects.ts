import type { Param } from "@w6w/types";

export const customObjectApiNameParam: Param = {
  key: "customObjectApiName",
  label: "Custom object API name",
  type: "string",
  required: true,
  hint: "The custom object's API name, as defined in Rippling's custom-object settings.",
};
