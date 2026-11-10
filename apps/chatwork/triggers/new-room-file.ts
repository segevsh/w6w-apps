import { newestFirstTrigger } from "../lib/triggers.ts";
import roomFileList from "../actions/room-file-list.ts";

interface Params {
  roomId: string;
}

export default newestFirstTrigger<Params>({
  key: "new-room-file",
  title: "New Chat File",
  description: "The run gets each file newly uploaded to a Chatwork chat (newest first).",
  action: roomFileList,
  input: (p) => ({ roomId: p.roomId }),
  idKey: "file_id",
  params: [{ key: "roomId", label: "Room ID", type: "string", required: true }],
  output: [
    { key: "file_id", type: "number", label: "File ID" },
    { key: "account", type: "object", label: "Who uploaded it" },
    { key: "message_id", type: "string", label: "The message ID the file came from" },
    { key: "filename", type: "string", label: "File name" },
    { key: "filesize", type: "number", label: "Size in bytes" },
    { key: "upload_time", type: "number", label: "Uploaded at (Unix seconds)" },
  ],
  sample: {
    file_id: 3001,
    account: { account_id: 1234, name: "Ada Lovelace" },
    message_id: "5550003",
    filename: "report.pdf",
    filesize: 20480,
    upload_time: 1794128400,
  },
});
