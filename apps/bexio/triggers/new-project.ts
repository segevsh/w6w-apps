import { pollFromListAction } from "../../_shared/poll/mod.ts";
import projectList from "../actions/project-list.ts";
import { idOf, rows } from "../lib/triggers.ts";

/**
 * Wraps `project-list` with `order_by=id_desc` — the documented `order_by` enum for
 * GET /2.0/pr_project takes an `_desc` suffix (https://docs.bexio.com, verified 2026-11-10).
 */
export default pollFromListAction({
  key: "new-project",
  title: "New Project",
  description: "The run gets each newly created project (sorted by ID, newest first).",
  action: projectList,
  input: () => ({ orderBy: "id", descending: true, limit: 100, offset: 0 }),
  items: rows,
  idOf: idOf,
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 101, name: "Website relaunch" },
  maxPages: 1,
});
