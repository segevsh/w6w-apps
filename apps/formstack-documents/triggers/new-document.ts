import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import documentList from "../actions/document-list.ts";

const trigger: TriggerDefinition = {
  key: "new-document",
  title: "New Document",
  description: "The run gets each document template newly added to the account.",
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Document ID" },
    { key: "values", type: "object", label: "Document" },
  ],
  sample: { change: "added", key: "123", values: { id: "123", name: "Contract" } },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const documents = await documentList.execute({}, ctx) as Array<
      { id?: string | number; [key: string]: unknown }
    >;
    return await pollSnapshot({
      state,
      rows: documents.flatMap((document) =>
        document.id ? [{ key: String(document.id), values: document }] : []
      ),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
