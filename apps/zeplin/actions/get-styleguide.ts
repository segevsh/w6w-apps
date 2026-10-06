import {
  getAction,
  linkedParams,
  linkedQuery,
  styleguideIdParam,
  styleguidePath,
} from "../lib/actions.ts";

export default getAction({
  key: "get-styleguide",
  resource: "styleguide",
  title: "Get Styleguide",
  description: "Get a styleguide by id (GET /v1/styleguides/{styleguide_id}).",
  params: [styleguideIdParam, ...linkedParams],
  path: styleguidePath,
  query: linkedQuery,
  output: [
    { key: "id", type: "string", label: "Styleguide ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "platform", type: "string", label: "Platform" },
    { key: "status", type: "string", label: "Status" },
    { key: "thumbnail", type: "string", label: "Thumbnail URL" },
    { key: "created", type: "number", label: "Created (UNIX seconds)" },
    { key: "updated", type: "number", label: "Updated (UNIX seconds)" },
    { key: "number_of_colors", type: "number", label: "Colors" },
    { key: "number_of_text_styles", type: "number", label: "Text styles" },
    { key: "number_of_components", type: "number", label: "Components" },
    { key: "number_of_members", type: "number", label: "Members" },
  ],
});
