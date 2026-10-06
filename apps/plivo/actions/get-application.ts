import type { ActionDefinition } from "@w6w/types";
import { PlivoClient, segment } from "../lib/client.ts";

interface Input {
  appId: string;
}

/** `GET /v1/Account/{auth_id}/Application/{app_id}/` */
const getApplication: ActionDefinition<Input> = {
  key: "get-application",
  type: "read",
  resource: "application",
  title: "Get Application",
  description: "Retrieve one application's URLs and settings.",
  params: [{ key: "appId", label: "Application ID", type: "string", required: true }],

  output: [
    { key: "app_id", type: "string", label: "Application ID" },
    { key: "app_name", type: "string", label: "Name" },
    { key: "answer_url", type: "string", label: "Answer URL" },
    { key: "hangup_url", type: "string", label: "Hangup URL" },
    { key: "message_url", type: "string", label: "Message URL" },
    { key: "enabled", type: "boolean", label: "Enabled" },
    { key: "default_app", type: "boolean", label: "Default application" },
  ],

  execute(input, ctx) {
    return new PlivoClient(ctx).request(`Application/${segment("appId", input.appId)}/`);
  },
};

export default getApplication;
