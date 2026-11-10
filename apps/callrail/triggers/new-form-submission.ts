import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import { accountParams } from "../lib/triggers.ts";
import formSubmissionList from "../actions/form-submission-list.ts";

export default pollFromListAction<{ accountId: string; companyId?: string }>({
  key: "new-form-submission",
  title: "New Form Submission",
  description: "The run gets each newly tracked form submission.",
  action: formSubmissionList as unknown as ActionDefinition,
  params: accountParams,
  input: (params) => ({
    ...params,
    sort: "submitted_at",
    order: "desc",
    page: 1,
    perPage: 100,
  }),
  items: (result) => (result as { form_submissions?: unknown[] }).form_submissions ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Form submission ID" },
    { key: "company_id", type: "string", label: "Company ID" },
    { key: "submitted_at", type: "string", label: "Submitted at" },
    { key: "customer_name", type: "string", label: "Customer name" },
    { key: "customer_email", type: "string", label: "Customer email" },
  ],
  sample: {
    id: "FRM1",
    company_id: "COM1",
    submitted_at: "2026-11-10T07:46:28.000Z",
    customer_name: "Sample Customer",
    customer_email: "customer@example.com",
  },
});
