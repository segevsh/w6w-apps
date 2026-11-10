import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import jobList from "../actions/job-list.ts";

const CAP = 100;

/**
 * A recruiter account's job postings are a small bounded set
 * (https://docs.linkupapi.com/api-reference/v2/recruiter/get-posts.md, `count`/`offset`, no
 * order documented), so they are read in one request (count 100, details off) and diffed as a
 * snapshot keyed by `linkedin_job_id`; only additions emit. More than 100 postings fails the
 * check with an error. Billed 1 credit per 10 postings returned, so the poll runs hourly.
 */
const trigger: TriggerDefinition = {
  key: "new-job",
  title: "New Job Posting",
  description: "The run gets each job posting newly created on the selected recruiter account.",
  params: [{ key: "accountId", label: "Account ID", type: "string", required: true }],
  output: [
    { key: "linkedin_job_id", type: "string", label: "Job ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "company_name", type: "string", label: "Company" },
    { key: "location", type: "string", label: "Location" },
    { key: "job_state", type: "string", label: "State" },
    { key: "job_url", type: "string", label: "Job URL" },
  ],
  sample: {
    linkedin_job_id: "4300000001",
    title: "Senior Engineer",
    company_name: "Example Co",
    location: "Remote",
    job_state: "LISTED",
    job_url: "/jobs/view/4300000001",
  },
  minIntervalMs: 3_600_000,
  async poll({ state, params }, ctx) {
    const result = await jobList.execute({
      accountId: String((params as { accountId?: unknown }).accountId ?? ""),
      count: CAP,
      offset: 0,
      fetchDetails: false,
    }, ctx) as { data?: { posts?: unknown; pagination?: { has_more?: unknown } } };
    const posts = Array.isArray(result?.data?.posts) ? result.data.posts : [];
    if (result?.data?.pagination?.has_more === true) {
      throw new Error(`LinkupAPI: more than ${CAP} job postings; close some and retry`);
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: posts.map((item: unknown) => ({
        key: String((item as { linkedin_job_id?: unknown }).linkedin_job_id ?? ""),
        values: item,
      })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
