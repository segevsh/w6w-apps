import { snapshotList } from "../lib/snapshot.ts";
import listContacts from "../actions/list-contacts.ts";

export default snapshotList<{ id: number }>({
  key: "new-list-contact",
  title: "New Contact in List",
  description: "The run gets each contact newly saved to the chosen contact list.",
  params: [{ key: "id", label: "List ID", type: "number", required: true }],
  action: listContacts,
  input: (p) => ({ id: p.id }),
  rows: (res) => {
    const data = Array.isArray(res.data) ? res.data : [];
    // The endpoint answers a DataTables envelope and the action exposes no paging; when the list
    // holds more contacts than one response carries, fail loudly rather than miss the rest.
    const total = Number(res.recordsFiltered ?? res.recordsTotal ?? data.length);
    if (Number.isFinite(total) && total > data.length) {
      throw new Error(
        `new-list-contact: the list holds ${total} contacts but one response carried ${data.length}`,
      );
    }
    return data;
  },
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "linkedin_url", type: "string", label: "LinkedIn URL" },
    { key: "company", type: "string", label: "Company" },
    { key: "job_title", type: "string", label: "Job title" },
  ],
  sample: {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    linkedin_url: "https://example.com/profile/johndoe",
    company: "Acme Corp",
    job_title: "CEO",
  },
});
