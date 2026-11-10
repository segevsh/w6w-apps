import { snapshotList } from "../lib/snapshot.ts";
import incidentCommentList from "../actions/incident-comment-list.ts";

export default snapshotList<{ incident_id: string }>({
  key: "new-incident-comment",
  title: "New Incident Comment",
  description: "The run gets each new comment on the chosen incident.",
  params: [{ key: "incident_id", label: "Incident ID", type: "string", required: true }],
  action: incidentCommentList,
  input: ({ incident_id }) => ({ incident_id }),
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "content", type: "string", label: "Content" },
  ],
  sample: { id: "123", type: "incident_comment", content: "posted from API" },
});
