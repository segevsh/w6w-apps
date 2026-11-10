import legalEntityList from "../actions/legal-entity-list.ts";
import { newRecordTrigger } from "../lib/snapshots.ts";

/**
 * `GET /v2/legal_entities` lists the account's legal entities: a handful of rows with no sort or
 * since filter, so every check reads all of it and diffs the ids.
 * https://developer.brex.com/openapi/team_api/legal-entities/listlegalentities.md (verified 2026-11-10)
 */
export default newRecordTrigger({
  key: "new-legal-entity",
  title: "New Legal Entity",
  description: "The run gets each legal entity newly added to your Brex account.",
  action: legalEntityList,
  output: [
    { key: "id", type: "string", label: "Legal entity ID" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "status", type: "string", label: "Status" },
    { key: "isDefault", type: "boolean", label: "Default entity" },
  ],
  sample: {
    id: "cuentity_sample0001",
    displayName: "Sample Inc.",
    billingAddress: { line1: "1 Sample Street", city: "San Francisco", country: "US" },
    createdAt: "2026-11-10T09:00:00.000Z",
    status: "ACTIVE",
    isDefault: true,
  },
});
