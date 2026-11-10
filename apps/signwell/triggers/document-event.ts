import { webhookTrigger } from "../lib/triggers.ts";

/** Any SignWell document or template event, or the subset the `events` param names. */
const documentEvent = webhookTrigger({
  key: "document-event",
  title: "Document or Template Event",
  description:
    "Fires on SignWell document and template events: created, sent, viewed, in progress, recipients updated, signed, completed, expired, canceled, declined, bounced, error, template created, error, available or unavailable, and SMS failures or opt-outs. Pick events with the events param or leave it empty for all. The run gets the event type and time, the related signer, the document or template id, name and status, the account id and the full object.",
});

export default documentEvent;
