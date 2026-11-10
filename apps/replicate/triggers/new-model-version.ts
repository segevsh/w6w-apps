import { pollFromListAction } from "../../_shared/poll/mod.ts";
import modelVersionList from "../actions/model-version-list.ts";

/** `GET /models/{owner}/{name}/versions` is documented "sorted with the most recent version first". */
export default pollFromListAction({
  key: "new-model-version",
  title: "New Model Version",
  description: "The run gets each new version published for one model.",
  action: modelVersionList,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      placeholder: "owner/name",
      hint: "The model to watch, as owner/name.",
    },
  ],
  input: (params: { model?: string }) => ({
    model: params.model,
    limit: 100,
    returnAll: false,
  }),
  items: (result) =>
    Array.isArray(result) ? result : (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Version ID" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "cog_version", type: "string", label: "Cog version" },
  ],
  sample: { id: "version-1", created_at: "2026-11-10T09:00:00Z", cog_version: "0.9.0" },
  maxPages: 1,
});
