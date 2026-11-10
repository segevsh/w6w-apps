import jobPostingList from "../actions/job-posting-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** Emits each job posting that appears in the organisation (`jobPosting.list`, a bounded collection diffed by id each check). Brief 9.1 (c). */
export default snapshotTrigger({
  key: "new-job-posting",
  title: "New Job Posting",
  description:
    "Emits each job posting that appears in the organisation (`jobPosting.list`, a bounded collection diffed by id each check).",
  action: jobPostingList,
  list: "postings",
  output: [{ key: "id", type: "string", label: "Job posting ID" }, {
    key: "title",
    type: "string",
    label: "Title",
  }, { key: "jobId", type: "string", label: "Job ID" }],
  sample: { id: "posting-101", title: "Engineer", jobId: "job-101" },
});
