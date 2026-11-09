import { pollFromListAction } from "../../_shared/poll/mod.ts";
import fileList from "../actions/file-list.ts";

type Params = { q?: string; driveId?: string };

function fileId(item: unknown): string {
  const id = (item as { id?: unknown }).id;
  if (typeof id !== "string" || id === "") throw new Error("Google Drive file has no id");
  return id;
}

const newFile = pollFromListAction<Params>({
  key: "new-file",
  title: "New File",
  description: "Polls Google Drive for newly created files. The run gets the new file.",
  action: fileList,
  input: (params) => ({
    q: params.q,
    driveId: params.driveId,
    pageSize: 100,
    orderBy: "createdTime desc",
  }),
  items: (result) => (result as { files?: unknown[] }).files ?? [],
  idOf: fileId,
  params: [
    { key: "q", label: "Query", type: "string", hint: "Google Drive `q` search syntax." },
    { key: "driveId", label: "Drive ID", type: "string" },
  ],
  output: [
    { key: "id", label: "File ID", type: "string" },
    { key: "name", label: "Name", type: "string" },
    { key: "mimeType", label: "MIME type", type: "string" },
    { key: "createdTime", label: "Created time", type: "string" },
  ],
  sample: {
    id: "1Jw4r9eKzTQX2d",
    name: "Quarterly plan",
    mimeType: "application/vnd.google-apps.document",
    createdTime: "2026-11-09T12:00:00Z",
  },
});

export default newFile;
