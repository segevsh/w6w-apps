import type { Param } from "@w6w/types";

export const pathParam = (hint = "Full path, e.g. /Shared/Documents/report.pdf."): Param => ({
  key: "path",
  label: "Path",
  type: "string",
  required: true,
  placeholder: "/Shared/Documents",
  hint,
});

export const sortDirection: Param = {
  key: "sortDirection",
  label: "Order",
  type: "select",
  options: [
    { value: "ascending", label: "Ascending" },
    { value: "descending", label: "Descending" },
  ],
  row: "sort",
};
