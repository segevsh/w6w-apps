import type { ActionDefinition } from "@w6w/types";
import { compact, RaiselyClient, seg } from "../lib/client.ts";
import { privateParam } from "../lib/params.ts";

interface Input {
  path: string;
  private?: boolean;
  campaign?: string;
}

const profileGet: ActionDefinition<Input> = {
  key: "profile-get",
  type: "read",
  resource: "profile",
  title: "Get Profile",
  description: "Retrieve one fundraiser profile by uuid or path.",
  params: [
    {
      key: "path",
      label: "Profile",
      type: "string",
      required: true,
      hint: "The uuid or path of the profile.",
    },
    {
      key: "campaign",
      label: "Campaign",
      type: "string",
      hint: "The uuid, path or domain of the campaign to associate with the request.",
    },
    privateParam(),
  ],
  output: [{ key: "uuid", type: "string", label: "profile uuid" }],

  async execute(input, ctx) {
    return await new RaiselyClient(ctx).data(`/profiles/${seg(input.path)}`, {
      query: compact({
        private: input.private,
        campaign: input.campaign,
      }),
    });
  },
};

export default profileGet;
