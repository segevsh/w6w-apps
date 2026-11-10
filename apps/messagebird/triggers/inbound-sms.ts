import { webhookTrigger } from "../lib/triggers.ts";

/** MessageBird forwards a message received on one of your numbers. */
const inboundSms = webhookTrigger({
  key: "inbound-sms",
  title: "Inbound SMS",
  description:
    "Fires when a text message arrives on a MessageBird virtual mobile number that is set to forward to this trigger's callback URL. The run gets the message id, your number, the sender, the text, the creation time and the full callback data.",
});

export default inboundSms;
