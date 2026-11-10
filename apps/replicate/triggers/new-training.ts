import { pollFromListAction } from "../../_shared/poll/mod.ts";
import trainingList from "../actions/training-list.ts";

/** `GET /trainings` is documented "sorted with the most recent training first", 100 per page. */
export default pollFromListAction({
  key: "new-training",
  title: "New Training",
  description: "The run gets each newly created training (fine-tune) on the account.",
  action: trainingList,
  input: () => ({ limit: 100, returnAll: false }),
  items: (result) =>
    Array.isArray(result) ? result : (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Training ID" },
    { key: "model", type: "string", label: "Model" },
    { key: "version", type: "string", label: "Version" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "training-1",
    model: "example-owner/example-model",
    version: "version-1",
    status: "starting",
    created_at: "2026-11-10T09:00:00Z",
  },
  maxPages: 1,
});
