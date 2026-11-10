import type { ActionDefinition } from "@w6w/types";
import { wholeListSnapshot } from "../lib/triggers.ts";
import skillList from "../actions/skill-list.ts";

/** `skill.list` returns the account's skills whole; with a Project ID it adds that project's own. Diffed by id (added rows only). */
export default wholeListSnapshot({
  key: "new-skill",
  title: "New Skill",
  description: "The run gets each newly available skill: id, name, description and owner type.",
  action: skillList as unknown as ActionDefinition,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      hint: "Also watch this project's own skills. Leave empty for the account's skills.",
    },
  ],
  input: (params) => (params.projectId ? { projectId: params.projectId } : {}),
  output: [
    { key: "id", type: "string", label: "Skill ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "owner_type", type: "string", label: "Owner type" },
  ],
  sample: {
    id: "skill-1",
    name: "Weekly report",
    description: "Builds the weekly report.",
    owner_type: "personal",
  },
});
