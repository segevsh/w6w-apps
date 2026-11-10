import type { TriggerDefinition } from "@w6w/types";
import { pollDrives } from "../lib/triggers.ts";

const trigger: TriggerDefinition<Record<string, never>, Record<string, unknown>> = {
  key: "new-drive",
  title: "New Drive",
  description:
    "The run gets a drive (a OneDrive or a SharePoint document library) that the signed-in user can newly reach.",
  params: [],
  output: [
    { key: "id", type: "string", label: "Drive ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "driveType", type: "string", label: "Drive type" },
    { key: "webUrl", type: "string", label: "Web URL" },
  ],
  sample: {
    id: "b!sample-drive",
    name: "Documents",
    driveType: "documentLibrary",
  },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => pollDrives({ state, ctx }),
};

export default trigger;
