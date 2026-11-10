import { signrequestSnapshot } from "../lib/triggers.ts";
import templateList from "../actions/template-list.ts";

/**
 * Shape (c) over `template-list` (`GET /templates/`): a team's templates are a small bounded collection, so each check reads
 * all of it and emits the ids not seen before (https://signrequest.com/api/v1/docs/).
 */
export default signrequestSnapshot({
  key: "new-template",
  title: "New Template",
  description: "The run gets each newly created template.",
  action: templateList as never,
  idOf: (item) => String((item as { uuid?: unknown }).uuid ?? ""),
  output: [
    { key: "uuid", type: "string", label: "Template ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "who", type: "string", label: "Who" },
  ],
  sample: { uuid: "00000000-0000-4000-8000-000000000002", name: "NDA", who: "m", signers: [] },
});
