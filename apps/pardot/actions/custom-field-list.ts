import { idFilters, nameFilter, timeFilters } from "../lib/filters.ts";
import { queryAction } from "../lib/query.ts";

export default queryAction({
  key: "custom-field-list",
  title: "List Custom Fields",
  description:
    "Query the prospect custom fields defined in this business unit. `apiFieldId` is the `…__c` name to use in other actions.",
  path: "custom-fields",
  resource: "custom-field",
  defaultFields: "id,name,fieldId,apiFieldId,type,isRequired,isRecordMultipleResponses,updatedAt",
  orderBy: ["id", "createdAt", "updatedAt"],
  supportsDeleted: false,
  filters: [
    nameFilter("custom field"),
    ...idFilters,
    ...timeFilters("createdAt"),
    ...timeFilters("updatedAt"),
  ],
});
