import { webhookTrigger } from "../lib/triggers.ts";

/** Lusha pushes a signal (promotion, job change, company news ...) for a watched contact or company. */
const signalReceived = webhookTrigger({
  key: "signal-received",
  title: "Signal Received",
  description:
    "Fires when Lusha detects a signal (a promotion, job change, company news or growth milestone) for a contact or company you watch. The run gets the signal type, the entity, the subscription, the signal time, the credits charged and the signal data.",
});

export default signalReceived;
