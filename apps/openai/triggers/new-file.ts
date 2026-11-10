import { pollFromListAction } from "../../_shared/poll/mod.ts";
import filesList from "../actions/files-list.ts";

export default pollFromListAction({
  key: "new-file",
  title: "New File",
  description: "The run gets each newly uploaded OpenAI file (newest first by created_at).",
  action: filesList,
  input: () => ({ limit: 20, order: "desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "File ID" },
    { key: "filename", type: "string", label: "Filename" },
    { key: "purpose", type: "string", label: "Purpose" },
    { key: "bytes", type: "number", label: "Size (bytes)" },
    { key: "created_at", type: "number", label: "Created at (Unix seconds)" },
  ],
  sample: {
    id: "file-abc123",
    filename: "training.jsonl",
    purpose: "fine-tune",
    bytes: 120000,
    created_at: 1762700000,
  },
  maxPages: 1,
});
