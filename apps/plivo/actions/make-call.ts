import type { ActionDefinition } from "@w6w/types";
import { joinDestinations, PlivoClient } from "../lib/client.ts";

type Verb = "GET" | "POST";

interface Input {
  from: string;
  to: string | string[];
  answerUrl: string;
  answerMethod?: Verb;
  ringUrl?: string;
  hangupUrl?: string;
  fallbackUrl?: string;
  callerName?: string;
  sendDigits?: string;
  timeLimit?: number;
  ringTimeout?: number;
  machineDetection?: "true" | "hangup";
}

/**
 * `POST /v1/Account/{auth_id}/Call/` — JSON body. Plivo does not run a script
 * you send; it fetches `answer_url` when the callee picks up and expects Plivo
 * XML back, which is why `answerUrl` is required. A success is `call fired`
 * with a `request_uuid`; the `call_uuid` only exists once the call is answered
 * (it arrives in the callbacks), so this action cannot return one.
 */
const makeCall: ActionDefinition<Input> = {
  key: "make-call",
  type: "perform",
  resource: "call",
  title: "Make Call",
  description: "Place an outbound call; Plivo fetches Plivo XML from your answer URL on pickup.",
  idempotent: false,
  params: [
    {
      key: "from",
      label: "From",
      type: "string",
      required: true,
      hint: "Caller ID: a Plivo number in E.164 format, e.g. 14157654321.",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint:
        "Destination number or SIP URI. Separate several (up to 1000) with `<` for a bulk call.",
    },
    {
      key: "answerUrl",
      label: "Answer URL",
      type: "string",
      required: true,
      hint: "Plivo requests this URL when the call is answered; it must return valid Plivo XML.",
    },
    {
      key: "answerMethod",
      label: "Answer method",
      type: "select",
      options: [{ value: "POST", label: "POST" }, { value: "GET", label: "GET" }],
    },
    {
      key: "options",
      label: "Additional options",
      type: "section",
      section: "collapsible",
      title: "Additional options",
      subtitle: "Callbacks, caller name, limits, machine detection",
      collapsed: true,
      children: [
        {
          key: "ringUrl",
          label: "Ring URL",
          type: "string",
          hint: "Notified when the call starts ringing.",
        },
        {
          key: "hangupUrl",
          label: "Hangup URL",
          type: "string",
          hint: "Notified when the call ends.",
        },
        {
          key: "fallbackUrl",
          label: "Fallback URL",
          type: "string",
          hint: "Used if the answer URL fails after 3 retries or a 60 s timeout.",
        },
        { key: "callerName", label: "Caller name", type: "string", hint: "Up to 50 characters." },
        {
          key: "sendDigits",
          label: "Send digits",
          type: "string",
          hint: "DTMF digits sent once connected; `w` waits 0.5 s, `W` waits 1 s.",
        },
        {
          key: "timeLimit",
          label: "Time limit (seconds)",
          type: "number",
          hint: "Maximum call duration. Plivo's default is 14,400 (4 hours).",
        },
        {
          key: "ringTimeout",
          label: "Ring timeout (seconds)",
          type: "number",
          hint: "Give up if nobody answers within this many seconds.",
        },
        {
          key: "machineDetection",
          label: "Machine detection",
          type: "select",
          options: [
            { value: "true", label: "Detect and notify" },
            { value: "hangup", label: "Detect and hang up" },
          ],
        },
      ],
    },
  ],

  output: [
    { key: "message", type: "string", label: "Status message" },
    { key: "request_uuid", type: "string", label: "Request UUID" },
    { key: "api_id", type: "string", label: "Request ID" },
  ],

  execute(input, ctx) {
    const to = joinDestinations(input.to);
    if (!to) throw new Error("`to` is required.");
    return new PlivoClient(ctx).request("Call/", {
      method: "POST",
      json: {
        from: input.from,
        to,
        answer_url: input.answerUrl,
        answer_method: input.answerMethod,
        ring_url: input.ringUrl,
        hangup_url: input.hangupUrl,
        fallback_url: input.fallbackUrl,
        caller_name: input.callerName,
        send_digits: input.sendDigits,
        time_limit: input.timeLimit,
        ring_timeout: input.ringTimeout,
        machine_detection: input.machineDetection,
      },
    });
  },
};

export default makeCall;
