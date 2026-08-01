import type { ActionDefinition } from "@w6w/types";
import { DeepLClient } from "../lib/client.ts";

interface Input {
  includeBeta?: boolean;
}

interface LanguageEntry {
  lang: string;
  name: string;
  usable_as_source: boolean;
  usable_as_target: boolean;
  status: "stable" | "beta" | "early_access";
}

interface LanguageSummary {
  lang: string;
  name: string;
  usableAsSource: boolean;
  usableAsTarget: boolean;
  status: "stable" | "beta" | "early_access";
}

interface Output {
  languages: LanguageSummary[];
}

/**
 * `GET /v3/languages?resource=translate_text` — every language DeepL
 * supports for text translation, source and target together in one call.
 * Filter the result on `usableAsSource` / `usableAsTarget` to populate
 * separate source/target pickers; the older `GET /v2/languages` (a separate
 * call per direction, via `type=source|target`) is deprecated in DeepL's own
 * docs in favor of this v3 endpoint.
 */
const listLanguages: ActionDefinition<Input, Output> = {
  key: "list-languages",
  type: "read",
  resource: "language",
  title: "List Languages",
  description: "List every language DeepL supports for text translation (source and target).",
  params: [
    {
      key: "includeBeta",
      label: "Include beta languages",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "languages", type: "array", label: "Languages" },
  ],

  async execute(input, ctx) {
    const client = new DeepLClient(ctx);
    const res = await client.request<LanguageEntry[]>("/v3/languages", {
      query: { resource: "translate_text", include: input.includeBeta ? "beta" : undefined },
    });
    return {
      languages: res.map((l) => ({
        lang: l.lang,
        name: l.name,
        usableAsSource: l.usable_as_source,
        usableAsTarget: l.usable_as_target,
        status: l.status,
      })),
    };
  },
};

export default listLanguages;
