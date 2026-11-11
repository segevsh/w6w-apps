import { webhookTrigger } from "../lib/triggers.ts";

/** Any GitHub webhook event: the `events` param picks which (blank is every event). */
const anyEvent = webhookTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on the GitHub webhook events you list, or on every event when the list is blank. The run gets the event name, the action and the payload.",
  sampleEvent: "check_run",
  hasActions: false,
  output: [],
  samplePayload: {
    action: "completed",
    check_run: { id: 4, name: "build", status: "completed", conclusion: "success" },
    repository: { full_name: "octocat/Hello-World" },
    sender: { login: "octocat" },
  },
});

export default anyEvent;
