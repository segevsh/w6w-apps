import type { TriggerDefinition } from "@w6w/types";
import { SNAPSHOT_TOP, snapshotAdded } from "../lib/feeds.ts";
import projectList from "../actions/project-list.ts";

type Project = { id?: unknown };

/** The organization's projects, requested with `$top=1000` and diffed with `pollSnapshot`. */
const trigger: TriggerDefinition = {
  key: "new-project",
  title: "New Project",
  description:
    "The run gets each project newly created in the organization (that the token can see).",
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "state", type: "string", label: "State" },
  ],
  sample: { id: "eb6e4656-77fc-42a1-9181-4c6d8e9da5d1", name: "Fabrikam", state: "wellFormed" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await projectList.execute({ limit: SNAPSHOT_TOP }, ctx) as { projects?: Project[] };
    return snapshotAdded(state, out.projects ?? [], (p) => String(p.id), "new-project");
  },
};

export default trigger;
