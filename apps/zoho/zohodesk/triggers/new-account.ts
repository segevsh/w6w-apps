import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/account-list.ts";
import { dataOf, idOf, ORG_PARAM } from "../lib/triggers.ts";

/**
 * `GET /accounts` takes `sortBy=-createdTime` ("accountName or createdTime ... A `-` prefix denotes
 * descending order", https://desk.zoho.com/DeskAPIDocument#Accounts, 2026-11-10), so page 1 is the
 * newest accounts. Accounts document no modified-time sort, so there is no "or updated" sibling.
 */
export default pollFromListAction({
  key: "new-account",
  title: "New Account",
  description:
    "The run gets each newly created Zoho Desk account (customer company), newest first.",
  action,
  params: [ORG_PARAM],
  input: (params: { orgId?: string }) => ({
    orgId: params.orgId,
    limit: 100,
    sortBy: "-createdTime",
  }),
  items: dataOf,
  idOf,
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "accountName", type: "string", label: "Account name" },
    { key: "website", type: "string", label: "Website" },
    { key: "createdTime", type: "string", label: "Created time" },
  ],
  sample: {
    id: "1892000000091433",
    accountName: "Example Co",
    website: "https://example.com",
    createdTime: "2026-11-09T12:00:00.000Z",
  },
});
