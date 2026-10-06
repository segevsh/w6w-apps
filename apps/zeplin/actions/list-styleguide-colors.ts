import {
  includeLinkedParam,
  includeLinkedQuery,
  linkedParams,
  linkedQuery,
  listAction,
  styleguideIdParam,
  styleguidePath,
} from "../lib/actions.ts";

export default listAction({
  key: "list-styleguide-colors",
  resource: "color",
  title: "List Styleguide Colors",
  description: "List the colors of a styleguide (GET /v1/styleguides/{styleguide_id}/colors).",
  params: [styleguideIdParam, ...linkedParams, includeLinkedParam],
  path: (i) => `${styleguidePath(i)}/colors`,
  query: (i) => ({ ...linkedQuery(i), ...includeLinkedQuery(i) }),
});
