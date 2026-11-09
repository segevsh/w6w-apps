import { pollFromListAction } from "../../_shared/poll/mod.ts";
import checklistList from "../actions/checklist-list.ts";

export const checklistOutput = [
  { key: "id", type: "number" as const, label: "Checklist ID" },
  { key: "name", type: "string" as const, label: "Name" },
  { key: "project_id", type: "string" as const, label: "Project ID" },
  { key: "updated_at", type: "number" as const, label: "Last updated (Unix seconds)" },
];

export const checklistSample = {
  id: 101,
  name: "Roof inspection",
  project_id: "5001",
  updated_at: 1762646400,
};

const idOf = (item: unknown) => String((item as { id?: unknown }).id ?? "");

export const checklistInput = () => ({ page: 1, perPage: 50 });
export const checklistItems = (result: unknown) => (result as { items?: unknown[] }).items ?? [];

// `checklist-list` returns the company's checklists newest-updated first (see the action's own
// doc); a freshly created checklist is the most recently updated one, so it lands on page 1.
export default pollFromListAction({
  key: "new-checklist",
  title: "New Checklist",
  description: "The run gets each newly created checklist.",
  action: checklistList,
  input: checklistInput,
  items: checklistItems,
  idOf,
  output: checklistOutput,
  sample: checklistSample,
  maxPages: 1,
});
