import { webhookTrigger } from "../lib/triggers.ts";

const inviteSigned = webhookTrigger({
  key: "invite-signed",
  title: "Invite Signed",
  event: "user.document.fieldinvite.signed",
  description:
    "Fires when a field invite the connected user sent is signed. The run gets the event name, timestamp, document id and name, user id and the full event content.",
});

export default inviteSigned;
