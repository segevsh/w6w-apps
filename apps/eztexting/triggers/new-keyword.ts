import { snapshotTrigger } from "../lib/triggers.ts";
import keywordList from "../actions/keyword-list.ts";

export default snapshotTrigger({
  key: "new-keyword",
  title: "New Keyword",
  description: "The run gets each keyword newly purchased on the account.",
  action: keywordList,
  output: [
    { key: "id", type: "number", label: "Keyword ID" },
    { key: "keyword", type: "string", label: "Keyword" },
  ],
  sample: { id: 4001, keyword: "JOIN" },
});
