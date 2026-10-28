import type { Param } from "@w6w/types";
import { LOCATION_PARAM, PROJECT_PARAM } from "./params.ts";

/** The params every publisher-model call (generate / count / embed / predict) starts with. */
export function modelParams(defaultModel: string): Param[] {
  return [
    PROJECT_PARAM,
    LOCATION_PARAM,
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: defaultModel,
      hint: "A Google publisher model id, or `publishers/{publisher}/models/{model}`.",
    },
  ];
}
