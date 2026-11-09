import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-sites.ts";

export default pollFromListAction({
  key: "new-site",
  title: "New Site",
  description: "The run gets each newly created Duda site.",
  action,
  input: (params) => ({
    ...params,
    limit: 100,
    offset: 0,
    sort: "CREATION_DATE",
    direction: "DESC",
  }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { site_name: string }).site_name),
  params: action.params,
  output: [{ key: "site_name", type: "string", label: "Site name" }],
  sample: { site_name: "acme", creation_date: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});
