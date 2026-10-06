import type { Param } from "@w6w/types";

/** `format`: nested objects (default) or flat key/value pairs. */
export const formatParam: Param = {
  key: "format",
  label: "Format",
  type: "select",
  options: [
    { value: "object", label: "Object (nested, Docparser's default)" },
    { value: "flat", label: "Flat key/value pairs" },
  ],
};
