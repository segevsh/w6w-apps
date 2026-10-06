import type { ActionDefinition } from "@w6w/types";
import { PlivoClient } from "../lib/client.ts";

type Verb = "GET" | "POST";

interface Input {
  appName: string;
  answerUrl?: string;
  answerMethod?: Verb;
  hangupUrl?: string;
  hangupMethod?: Verb;
  fallbackAnswerUrl?: string;
  fallbackMethod?: Verb;
  messageUrl?: string;
  messageMethod?: Verb;
  logIncomingMessages?: boolean;
}

const METHODS = [{ value: "POST", label: "POST" }, { value: "GET", label: "GET" }];

/**
 * `POST /v1/Account/{auth_id}/Application/` → 201 `{ message: "created",
 * app_id, api_id }`. Only the name is required: voice URLs, message URL and the
 * fallback are each optional. `defaultNumberApp` / `defaultEndpointApp` /
 * `subaccount` are not exposed.
 */
const createApplication: ActionDefinition<Input> = {
  key: "create-application",
  type: "perform",
  resource: "application",
  title: "Create Application",
  description: "Create an application that numbers can be pointed at.",
  idempotent: false,
  params: [
    { key: "appName", label: "Name", type: "string", required: true },
    {
      key: "answerUrl",
      label: "Answer URL",
      type: "string",
      hint: "Requested when an incoming call is answered; must return Plivo XML.",
    },
    { key: "answerMethod", label: "Answer method", type: "select", options: METHODS },
    { key: "hangupUrl", label: "Hangup URL", type: "string" },
    { key: "hangupMethod", label: "Hangup method", type: "select", options: METHODS },
    { key: "fallbackAnswerUrl", label: "Fallback answer URL", type: "string" },
    { key: "fallbackMethod", label: "Fallback method", type: "select", options: METHODS },
    {
      key: "messageUrl",
      label: "Message URL",
      type: "string",
      hint: "Requested when a message arrives on a number using this application.",
    },
    { key: "messageMethod", label: "Message method", type: "select", options: METHODS },
    {
      key: "logIncomingMessages",
      label: "Log incoming messages",
      type: "boolean",
      hint: "Whether Plivo keeps the content of messages received through this application.",
    },
  ],

  output: [
    { key: "message", type: "string", label: "Status message" },
    { key: "app_id", type: "string", label: "Application ID" },
    { key: "api_id", type: "string", label: "Request ID" },
  ],

  execute(input, ctx) {
    return new PlivoClient(ctx).request("Application/", {
      method: "POST",
      json: {
        app_name: input.appName,
        answer_url: input.answerUrl,
        answer_method: input.answerMethod,
        hangup_url: input.hangupUrl,
        hangup_method: input.hangupMethod,
        fallback_answer_url: input.fallbackAnswerUrl,
        fallback_method: input.fallbackMethod,
        message_url: input.messageUrl,
        message_method: input.messageMethod,
        log_incoming_messages: input.logIncomingMessages,
      },
    });
  },
};

export default createApplication;
