import { listAction } from "../lib/actions.ts";

export default listAction({
  "key": "webhook-events-list",
  "noun": "webhook events",
  "path": "/webhooks/events",
  "scope": "webhooks.read",
  "description":
    "List the event IDs a webhook can subscribe to (e.g. `task.created`). Needs the `webhooks.read` scope.",
});
