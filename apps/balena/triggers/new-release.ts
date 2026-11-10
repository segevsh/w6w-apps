import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/release-list.ts";

const trigger = pollFromListAction({
  key: "new-release",
  title: "New Release",
  description:
    "The run gets each newly successful release of the selected fleet (running and failed builds are skipped until they succeed).",
  action: action as unknown as ActionDefinition,
  input: (params) => ({
    fleet: (params as { fleet?: string }).fleet,
    includeUnsuccessful: false,
    includeInvalidated: false,
    limit: 50,
  }),
  items: (result) => (result as { releases?: unknown[] }).releases ?? [],
  idOf: (item) => String((item as { id?: number }).id),
  params: (action.params ?? []).filter((p) => p.key === "fleet"),
  output: [
    { key: "id", type: "number", label: "Release ID" },
    { key: "commit", type: "string", label: "Commit" },
    { key: "raw_version", type: "string", label: "Version" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 1234567,
    commit: "a1b2c3d4e5f6",
    raw_version: "1.0.3",
    status: "success",
    is_invalidated: false,
    created_at: "2026-11-09T10:00:00.000Z",
  },
  maxPages: 1,
});

export default trigger;
