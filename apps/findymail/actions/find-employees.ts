import type { ActionDefinition } from "@w6w/types";
import { compact, FindymailClient, strList } from "../lib/client.ts";

interface Input {
  website: string;
  job_titles: string;
  count?: number;
}

const findEmployees: ActionDefinition<Input> = {
  key: "find-employees",
  type: "search",
  resource: "finder",
  title: "Find Employees",
  description:
    "Find employees at a company website by job title. Costs 1 credit per contact found and returns NO email (use Find Email from LinkedIn Profile on the result). Findymail's response is a bare array, returned here as `employees`. Spends credits only on a hit; a 402 means the balance is empty and a 423 that the subscription is paused.",
  params: [{ "key": "website", "label": "Company website", "type": "string", "required": true }, {
    "key": "job_titles",
    "label": "Job titles",
    "type": "text",
    "required": true,
    "hint": "Comma-separated, max 10.",
  }, {
    "key": "count",
    "label": "Contacts to return",
    "type": "number",
    "hint": "Max 5, default 1.",
  }],
  output: [{
    "key": "employees",
    "type": "array",
    "label": "Contacts (name, linkedinUrl, companyWebsite, companyName, jobTitle)",
  }],

  async execute(input, ctx) {
    const jobTitles = strList(input.job_titles);
    if (!jobTitles) throw new Error("Find Employees needs at least one job title.");
    const body = await new FindymailClient(ctx).request<unknown[]>(
      "POST",
      "/api/search/employees",
      {
        body: compact({ website: input.website, job_titles: jobTitles, count: input.count }),
      },
    );
    return { employees: Array.isArray(body) ? body : [] };
  },
};

export default findEmployees;
