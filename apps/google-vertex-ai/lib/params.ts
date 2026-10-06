import type { Param } from "@w6w/types";
import { LOCATIONS } from "./regions.ts";

/** The Google Cloud project — billed for the call, collected once on the Connection. */
export const PROJECT_PARAM: Param = {
  key: "projectId",
  label: "Project ID",
  type: "string",
  default: "",
  placeholder: "my-gcp-project",
  hint: "Leave blank to use the project on the connection. This project is billed.",
};

/** The location — picks the host (`{region}-aiplatform.googleapis.com`) and the resource path. */
export const LOCATION_PARAM: Param = {
  key: "location",
  label: "Location",
  type: "select",
  options: LOCATIONS.map((l) => ({ value: l, label: l })),
  hint: "Leave blank to use the connection's location. Models and endpoints live in one " +
    "region; `global` is served from the global host and suits Gemini publisher models.",
};

/** The two params every list action shares. */
export const LIST_PARAMS: Param[] = [
  { key: "returnAll", label: "Return All", type: "boolean", default: false },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    hint: "Max number of results when Return All is off.",
  },
  {
    key: "filter",
    label: "Filter",
    type: "string",
    default: "",
    hint: "Vertex AI's list filter syntax (the supported fields differ per resource).",
  },
];
