import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import themeGetMany from "../actions/theme-get-many.ts";
import { idOf, itemsOf } from "../lib/lists.ts";

/**
 * Newest-first by documentation: "Themes are listed in reverse-chronological order based on the
 * date you added them to your account" (https://www.typeform.com/developers/create/reference/retrieve-themes/,
 * 2026-11-10).
 */
export default pollFromListAction<Record<string, never>>({
  key: "new-theme",
  title: "New Theme",
  description:
    "Fires when a theme is added to the Typeform account. The run gets the theme's id, name, colors and font.",
  action: themeGetMany as unknown as ActionDefinition,
  input: () => ({ pageSize: 50 }),
  items: itemsOf,
  idOf: (item) => idOf(item, "theme"),
  output: [
    { key: "id", type: "string", label: "Theme ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "font", type: "string", label: "Font" },
    { key: "colors", type: "object", label: "Colors" },
    { key: "visibility", type: "string", label: "Visibility" },
  ],
  sample: {
    id: "ThemeAbC1",
    name: "Brand light",
    font: "Roboto",
    colors: { question: "#3D3D3D", answer: "#4FB0AE", button: "#4FB0AE", background: "#FFFFFF" },
    visibility: "private",
  },
});
