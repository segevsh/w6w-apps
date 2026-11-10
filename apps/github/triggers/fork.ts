import { webhookTrigger } from "../lib/triggers.ts";

/** A repository forked. */
const fork = webhookTrigger({
  key: "fork",
  title: "Fork Event",
  description: "Fires when the repository is forked. The run gets the new fork (forkee).",
  event: "fork",
  hasActions: false,
  output: [
    { key: "payload.forkee", type: "object", label: "New fork" },
    { key: "payload.forkee.full_name", type: "string", label: "Fork full name" },
  ],
  samplePayload: {
    forkee: { full_name: "hubot/Hello-World", html_url: "https://github.com/hubot/Hello-World" },
    repository: { full_name: "octocat/Hello-World" },
    sender: { login: "hubot" },
  },
});

export default fork;
