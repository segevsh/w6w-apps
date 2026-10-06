import type { ActionDefinition } from "@w6w/types";
import { WistiaClient } from "../lib/client.ts";

const accountGet: ActionDefinition<Record<string, never>> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "The Wistia account behind this connection: name, URL and record counts.",
  params: [],
  output: [
    { key: "id", type: "number", label: "Account ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "url", type: "string", label: "URL" },
    { key: "media_count", type: "number", label: "Media count" },
    { key: "video_limit", type: "number", label: "Video limit (null when unlimited)" },
    { key: "folder_count", type: "number", label: "Folder count" },
    { key: "channel_count", type: "number", label: "Channel count" },
  ],

  execute(_input, ctx) {
    return new WistiaClient(ctx).json("/account");
  },
};

export default accountGet;
