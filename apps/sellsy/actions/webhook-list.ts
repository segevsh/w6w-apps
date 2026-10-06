import { listAction } from "../lib/actions.ts";

export default listAction({
  "key": "webhook-list",
  "noun": "webhooks",
  "path": "/webhooks",
  "scope": "webhooks.read",
});
