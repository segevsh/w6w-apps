import { deleteAction } from "../lib/actions.ts";

export default deleteAction({
  "key": "webhook",
  "noun": "webhook",
  "path": "/webhooks",
  "scope": "webhooks.write",
});
