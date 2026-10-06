import {
  getAction,
  includeLinkedParam,
  includeLinkedQuery,
  projectIdParam,
  projectPath,
} from "../lib/actions.ts";

const CASES = ["kebab", "snake", "camel", "pascal", "constant", "original"];

export default getAction({
  key: "get-project-design-tokens",
  resource: "design_token",
  title: "Get Project Design Tokens",
  description:
    "Fetch all design tokens (colors, text styles, spacing) of a project (GET /v1/projects/{project_id}/design_tokens).",
  params: [
    projectIdParam,
    includeLinkedParam,
    {
      key: "tokenNameCase",
      label: "Token name case",
      type: "select",
      default: "kebab",
      options: CASES.map((c) => ({ value: c, label: c })),
    },
  ],
  path: (i) => `${projectPath(i)}/design_tokens`,
  query: (i) => {
    const tokenCase = String(i.tokenNameCase ?? "").trim();
    if (tokenCase && !CASES.includes(tokenCase)) {
      throw new Error(`Token name case must be one of ${CASES.join(", ")}`);
    }
    return { ...includeLinkedQuery(i), token_name_case: tokenCase || undefined };
  },
  output: [
    { key: "colors", type: "object", label: "Color tokens" },
    { key: "text_styles", type: "object", label: "Text style tokens" },
    { key: "spacing", type: "object", label: "Spacing tokens" },
  ],
});
