import type { ActionDefinition } from "@w6w/types";
import { PylonClient, seg } from "../lib/client.ts";
import { idParam, ISSUE_OUTPUT } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `GET /issues/{id}` — the id or the issue number. */
const issueGet: ActionDefinition<Input> = {
  key: "issue-get",
  type: "read",
  resource: "issue",
  title: "Get Issue",
  description: "Fetch one issue by its ID or issue number.",
  params: [idParam("Issue ID or number")],
  output: ISSUE_OUTPUT,

  execute(input, ctx) {
    return new PylonClient(ctx).one("GET", `/issues/${seg(input.id)}`);
  },
};

export default issueGet;
