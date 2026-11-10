import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-file-uploads.ts";

const trigger = pollFromListAction({
  key: "new-file-upload",
  title: "New File Upload",
  description:
    "The run gets each file upload created by the connection, newest first (Notion lists file uploads by most recent first).",
  action,
  input: () => ({ pageSize: 25 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "File upload ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "filename", type: "string", label: "File name" },
    { key: "content_type", type: "string", label: "Content type" },
    { key: "content_length", type: "number", label: "Size in bytes" },
    { key: "created_time", type: "string", label: "Created time" },
  ],
  sample: {
    "object": "file_upload",
    "id": "b52b8ed6-e029-4707-a671-832549c09de3",
    "status": "uploaded",
    "filename": "report.pdf",
    "content_type": "application/pdf",
    "content_length": 48213,
    "created_time": "2026-11-10T08:00:00.000Z",
  },
  maxPages: 1,
});

export default trigger;
