import titleList from "../actions/title-list.ts";
import { newRecordTrigger } from "../lib/snapshots.ts";

/**
 * `GET /v2/titles` lists a company's titles: a small directory with no sort or since filter, so every
 * check reads all of it (`limit` 1000, `cursor` paging) and diffs the ids.
 * https://developer.brex.com/openapi/team_api/titles/listtitles.md (verified 2026-11-10)
 */
export default newRecordTrigger({
  key: "new-title",
  title: "New Title",
  description: "The run gets each title newly created in your Brex account.",
  action: titleList,
  output: [
    { key: "id", type: "string", label: "Title ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "cutitle_sample0001", name: "Sample Title" },
});
