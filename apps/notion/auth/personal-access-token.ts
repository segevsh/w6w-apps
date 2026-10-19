import type { AuthDefinition } from "@w6w/types";
import internalSecret from "./internal-secret.ts";

export default {
  ...internalSecret,
  key: "personal-access-token",
  displayName: "Personal Access Token",
  description:
    "Connect as a Notion user with a personal access token. Supports private workspace pages without a parent.",
  fields: [{
    key: "apiKey",
    label: "Personal Access Token",
    type: "secret",
    required: true,
    hint:
      "Create a personal access token in Notion's developer settings. Access follows the token's permissions.",
  }],
} satisfies AuthDefinition;
