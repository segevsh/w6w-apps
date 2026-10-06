import {
  flagParam,
  includeLinkedParam,
  includeLinkedQuery,
  linkedParams,
  linkedQuery,
  listAction,
  styleguideIdParam,
  styleguidePath,
} from "../lib/actions.ts";

export default listAction({
  key: "list-styleguide-components",
  resource: "component",
  title: "List Styleguide Components",
  description:
    "List the components of a styleguide (GET /v1/styleguides/{styleguide_id}/components).",
  params: [
    styleguideIdParam,
    ...linkedParams,
    {
      key: "sectionId",
      label: "Section ID",
      type: "string",
      hint: "Only components in this section.",
    },
    includeLinkedParam,
    flagParam(
      "includeLatestVersion",
      "Include latest version",
      "Embed each component's latest version.",
    ),
  ],
  path: (i) => `${styleguidePath(i)}/components`,
  query: (i) => ({
    ...linkedQuery(i),
    ...includeLinkedQuery(i),
    section_id: String(i.sectionId ?? "").trim() || undefined,
    include_latest_version: i.includeLatestVersion ? true : undefined,
  }),
});
