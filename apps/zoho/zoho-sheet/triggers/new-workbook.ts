import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/workbook-list.ts";

export default pollFromListAction({
  key: "new-workbook",
  title: "New Workbook",
  description: "The run gets each workbook created in (or shared with) the account, newest first.",
  action,
  input: () => ({ startIndex: 1, count: 100, sortOption: "recently_created" }),
  items: (result) => (result as { workbooks?: unknown[] }).workbooks ?? [],
  idOf: (item) => String((item as { resource_id?: unknown }).resource_id ?? ""),
  output: [
    { key: "resource_id", type: "string", label: "Workbook ID" },
    { key: "workbook_name", type: "string", label: "Workbook name" },
    { key: "workbook_url", type: "string", label: "Workbook URL" },
    { key: "created_by", type: "string", label: "Created by" },
    { key: "created_time", type: "string", label: "Created time" },
    { key: "last_modified_time", type: "string", label: "Last modified time" },
  ],
  sample: {
    resource_id: "aaaaabbbbbccccdddddeeeee",
    workbook_name: "Q4 budget",
    workbook_url: "https://sheet.zoho.com/sheet/open/aaaaabbbbbccccdddddeeeee",
    created_by: "jack",
    created_time: "Friday, 6 April, 2018 4:13:36 PM",
    last_modified_time: "Friday, 6 April, 2018 4:14:10 PM",
  },
});
