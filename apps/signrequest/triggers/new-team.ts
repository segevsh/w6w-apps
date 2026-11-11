import { signrequestSnapshot } from "../lib/triggers.ts";
import teamList from "../actions/team-list.ts";

/**
 * Shape (c) over `team-list` (`GET /teams/`): the teams the token reaches are a small bounded collection, so each check reads
 * all of it and emits the ids not seen before (https://signrequest.com/api/v1/docs/).
 */
export default signrequestSnapshot({
  key: "new-team",
  title: "New Team",
  description: "The run gets each newly created team.",
  action: teamList as never,
  idOf: (item) => String((item as { subdomain?: unknown }).subdomain ?? ""),
  output: [
    { key: "subdomain", type: "string", label: "Subdomain" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { subdomain: "acme", name: "Acme" },
});
