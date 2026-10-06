import type { Param } from "@w6w/types";

export const formDir: Param = {
  key: "formDir",
  label: "Form directory",
  type: "string",
  required: true,
  hint: "The form's URL directory, e.g. `form123` in `…/example/form123/index.html`.",
};
