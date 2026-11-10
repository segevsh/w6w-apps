import type { TriggerDefinition } from "@w6w/types";
import sectionList from "../actions/section-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /projects/{project_id}/sections`
 * (https://developers.everhour.com/api-reference/projects/get-project-sections.md) answers the
 * project's whole section list in one unpaged response (a handful per project), diffed as a
 * snapshot; only additions emit.
 */
const trigger: TriggerDefinition = snapshotTrigger({
  key: "new-section",
  title: "New Section",
  description: "The run gets each section newly added to the selected Everhour project.",
  noun: "sections",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint:
        "Everhour project id: `ev:1234567890` for a native project, or `{platform}:{id}` such as `as:123456` for an integration project.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Section ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "position", type: "number", label: "Position" },
  ],
  sample: { id: 1234, name: "Backlog", status: "open", position: 1 },
  read: (params, _page, ctx) =>
    sectionList.execute({ projectId: String(params.projectId ?? "") }, ctx),
  keyOf: (item) => String((item as { id?: unknown }).id ?? ""),
});

export default trigger;
