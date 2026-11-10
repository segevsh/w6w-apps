import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created Zoho Desk contact, newest first.",
  action,
  params: [
    {
      key: "orgId",
      label: "Organization ID",
      type: "string",
      hint:
        "Zoho Desk orgId. Leave empty to use the one recorded when the connection was authorized.",
    },
  ],
  input: (params: { orgId?: string }) => ({
    orgId: params.orgId,
    limit: 100,
    sortBy: "-createdTime",
  }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "phone", type: "string", label: "Phone" },
    { key: "accountId", type: "string", label: "Account ID" },
    { key: "createdTime", type: "string", label: "Created time" },
  ],
  sample: {
    id: "1892000000772003",
    firstName: "Jonathan",
    lastName: "Case",
    email: "case@example.com",
    phone: "555555",
    accountId: "1892000000091433",
    createdTime: "2026-11-09T12:00:00.000Z",
  },
});
