import { twilioTrigger } from "../lib/triggers.ts";

/** An SMS or MMS sent to a Twilio number whose messaging webhook points here. */
const incomingMessage = twilioTrigger({
  key: "incoming-message",
  title: "Incoming Message",
  description:
    "Fires when someone texts a Twilio number whose webhook points here. The run gets the sender, recipient, text and any media URLs.",
  kind: "incoming",
});

export default incomingMessage;
