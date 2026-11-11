import type { ActionDefinition } from "@w6w/types";
import projectCommentList from "../actions/project-comment-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// `GET /v2/projects/{id}/comments` for the project the user picks; one project's comments are a
// bounded collection, snapshotted each check (brief 9.1c).
export default snapshotTrigger<{ projectId: string }>({
  key: "new-project-comment",
  title: "New Project Comment",
  description: "The run gets each comment newly added to one project.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "The project to watch (its ID is in the project URL or a List Projects result).",
    },
  ],
  action: projectCommentList as unknown as ActionDefinition,
  input: (p) => ({ projectId: p.projectId }),
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "creator_name", type: "string", label: "Author" },
    { key: "content", type: "string", label: "Comment" },
    { key: "commentable_id", type: "string", label: "Project ID" },
    { key: "created_at", type: "number", label: "Created (Unix seconds)" },
  ],
  sample: {
    id: "4001",
    creator_name: "Ada Roe",
    content: "Roof is done",
    commentable_id: "5001",
    commentable_type: "Project",
    created_at: 1762646400,
  },
});
