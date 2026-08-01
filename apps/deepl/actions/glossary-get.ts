import type { ActionDefinition } from "@w6w/types";
import { DeepLClient } from "../lib/client.ts";

interface Input {
  glossaryId: string;
}

interface GlossaryMeta {
  glossary_id: string;
  name: string;
  ready: boolean;
  source_lang: string;
  target_lang: string;
  creation_time: string;
  entry_count: number;
}

interface Output {
  glossaryId: string;
  name: string;
  ready: boolean;
  sourceLang: string;
  targetLang: string;
  creationTime: string;
  entryCount: number;
}

/** `GET /v2/glossaries/{glossary_id}` — metadata for one glossary. */
const glossaryGet: ActionDefinition<Input, Output> = {
  key: "glossary-get",
  type: "read",
  resource: "glossary",
  title: "Get Glossary",
  description: "Get metadata for a single glossary.",
  params: [
    { key: "glossaryId", label: "Glossary ID", type: "string", required: true },
  ],
  output: [
    { key: "glossaryId", type: "string", label: "Glossary ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "ready", type: "boolean", label: "Ready" },
    { key: "sourceLang", type: "string", label: "Source language" },
    { key: "targetLang", type: "string", label: "Target language" },
    { key: "creationTime", type: "string", label: "Creation time" },
    { key: "entryCount", type: "number", label: "Entry count" },
  ],

  async execute(input, ctx) {
    const client = new DeepLClient(ctx);
    const g = await client.request<GlossaryMeta>(`/v2/glossaries/${input.glossaryId}`);
    return {
      glossaryId: g.glossary_id,
      name: g.name,
      ready: g.ready,
      sourceLang: g.source_lang,
      targetLang: g.target_lang,
      creationTime: g.creation_time,
      entryCount: g.entry_count,
    };
  },
};

export default glossaryGet;
