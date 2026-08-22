import type { Param } from "@w6w/types";

/** Every board-scoped action takes this. */
export const BOARD_PARAM: Param = {
  key: "boardId",
  label: "Board ID",
  type: "string",
  required: true,
  default: "",
  placeholder: "uXjVK...=",
  hint: "The board's ID, from its URL or from List boards.",
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
];

/** Where an item goes on the board. Miro places it for you when both are blank. */
export const POSITION_PARAMS: Param[] = [
  { key: "x", label: "X", type: "number", default: null, hint: "Board coordinate." },
  { key: "y", label: "Y", type: "number", default: null },
];

/** Optional size, and the frame an item belongs to. */
export const GEOMETRY_PARAMS: Param[] = [
  { key: "width", label: "Width", type: "number", default: null },
  { key: "height", label: "Height", type: "number", default: null },
];

export const PARENT_PARAM: Param = {
  key: "parentId",
  label: "Parent Frame ID",
  type: "string",
  default: "",
  hint: "Place the item inside this frame.",
};
