import { searchAction } from "../lib/params.ts";

export default searchAction({
  key: "job-search",
  resource: "job",
  title: "Search Jobs",
  description:
    "Find jobs by name, status, location or company/contact details (`GET /v1/jobs/search`). " +
    "Custom-field filters are not exposed.",
  path: "/jobs",
  filters: [
    { key: "name", api: "name", label: "Job name" },
    { key: "jobStatus", api: "job_status", label: "Job status id", type: "number" },
    { key: "noteForCandidates", api: "note_for_candidates", label: "Note for candidates" },
    { key: "fullAddress", api: "full_address", label: "Full address" },
    { key: "city", api: "city", label: "City" },
    { key: "locality", api: "locality", label: "Locality" },
    { key: "country", api: "country", label: "Country" },
    { key: "companyName", api: "company_name", label: "Company name" },
    { key: "contactName", api: "contact_name", label: "Contact name" },
    { key: "contactEmail", api: "contact_email", label: "Contact email" },
    { key: "contactNumber", api: "contact_number", label: "Contact phone" },
    { key: "sortBy", api: "sort_by", label: "Sort by" },
    { key: "sortOrder", api: "sort_order", label: "Sort order" },
  ],
});
