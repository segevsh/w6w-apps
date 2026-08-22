import type { Param } from "@w6w/types";

/** Paging, shared by the list actions. EasyPost caps a page at 100. */
export const LIST_PARAMS: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 20,
    hint: "EasyPost caps a page at 100. Its list endpoints allow only five requests a second, so " +
      "this app fetches one page rather than walking.",
  },
  {
    key: "beforeId",
    label: "Before ID",
    type: "string",
    default: "",
    advanced: true,
    hint: "Pass the last id from the previous page to continue backwards through the list.",
  },
];

/** An address given inline as JSON, or by id. */
export const addressParam = (key: string, label: string, hint: string): Param => ({
  key,
  label,
  type: "json",
  required: true,
  default: "",
  hint,
});
