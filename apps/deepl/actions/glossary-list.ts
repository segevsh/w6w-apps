import type { ActionDefinition } from "@w6w/types";
import { DeepLClient } from "../lib/client.ts";

interface GlossaryMeta {
  glossary_id: string;
  name: string;
  ready: boolean;
  source_lang: string;
  target_lang: string;
  creation_time: string;
  entry_count: number;
}

interface GlossarySummary {
  glossaryId: string;
  name: string;
  ready: boolean;
  sourceLang: string;
  targetLang: string;
  creationTime: string;
  entryCount: number;
}

interface Output {
  glossaries: GlossarySummary[];
}

/**
 * `GET /v2/glossaries` — metadata for every glossary on the account (not the
 * term entries themselves — see `glossary-get` for a single glossary's
 * detail, or DeepL's `GET /v2/glossaries/{id}/entries` for the term list,
 * which this app does not expose).
 */
const glossaryList: ActionDefinition<Record<string, never>, Output> = {
  key: "glossary-list",
  type: "read",
  resource: "glossary",
  title: "List Glossaries",
  description: "List all glossaries on the account.",
  params: [],
  output: [
    { key: "glossaries", type: "array", label: "Glossaries" },
  ],

  async execute(_input, ctx) {
    const client = new DeepLClient(ctx);
    const res = await client.request<{ glossaries: GlossaryMeta[] }>("/v2/glossaries");
    return {
      glossaries: res.glossaries.map((g) => ({
        glossaryId: g.glossary_id,
        name: g.name,
        ready: g.ready,
        sourceLang: g.source_lang,
        targetLang: g.target_lang,
        creationTime: g.creation_time,
        entryCount: g.entry_count,
      })),
    };
  },
};

export default glossaryList;
