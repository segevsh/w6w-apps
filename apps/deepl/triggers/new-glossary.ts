import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import glossaryList from "../actions/glossary-list.ts";

/**
 * Wraps `glossary-list` (`GET /v2/glossaries`): one unpaginated response holding every glossary on
 * the account, so the collection is one bounded snapshot (the kit refuses more than 5000 rows).
 */
const trigger: TriggerDefinition = {
  key: "new-glossary",
  title: "New Glossary",
  description: "The run gets each newly created DeepL glossary.",
  params: [],
  output: [
    { key: "glossaryId", type: "string", label: "Glossary ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "sourceLang", type: "string", label: "Source language" },
    { key: "targetLang", type: "string", label: "Target language" },
    { key: "creationTime", type: "string", label: "Created at" },
    { key: "entryCount", type: "number", label: "Entries" },
  ],
  sample: {
    glossaryId: "def3a26b-3e84-45b3-84ae-0c0aaf3525f7",
    name: "Legal",
    ready: true,
    sourceLang: "EN",
    targetLang: "DE",
    creationTime: "2026-11-09T10:00:00Z",
    entryCount: 42,
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await (glossaryList as ActionDefinition).execute({}, ctx) as {
      glossaries?: Array<Record<string, unknown>>;
    };
    const { events, nextState } = await pollSnapshot({
      state,
      rows: (result.glossaries ?? []).map((item) => ({
        key: String(item.glossaryId ?? ""),
        values: item,
      })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
