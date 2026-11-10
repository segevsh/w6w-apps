import { newestFirstTrigger } from "../lib/triggers.ts";
import personList from "../actions/person-list.ts";

export default newestFirstTrigger({
  key: "new-or-updated-person",
  title: "New or Updated Person",
  description:
    "The run gets each Float person record that was created or edited (an edit is a new event, newest-modified first).",
  action: personList,
  sort: "-modified",
  idKey: "people_id",
  stampKey: "modified",
  output: [
    { key: "people_id", type: "number", label: "Person ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "job_title", type: "string", label: "Job title" },
    { key: "active", type: "number", label: "1 if active" },
    { key: "created", type: "string", label: "Created at" },
    { key: "modified", type: "string", label: "Last modified at" },
  ],
  sample: {
    people_id: 201,
    name: "Ada Lovelace",
    email: "ada@example.com",
    job_title: "Engineer",
    active: 1,
    created: "2026-11-09 12:00:00",
    modified: "2026-11-09 12:00:00",
  },
});
