import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

type Input = Record<string, unknown>;

const userProfileGet: ActionDefinition<Input> = {
  key: "user-profile-get",
  type: "read",
  resource: "account",
  title: "Get User Profile",
  description: "Fetch the profile of the Cloze user the API key belongs to.",
  params: [],
  output: [
    { key: "profile", type: "object", label: "Profile" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "E-mail" },
    { key: "key", type: "string", label: "User key" },
  ],

  async execute(_input, ctx) {
    const res = await call(ctx, "GET", "/v1/user/profile");
    return {
      ...((res.profile as Record<string, unknown> | undefined) ?? {}),
      profile: res.profile ?? {},
    };
  },
};

export default userProfileGet;
