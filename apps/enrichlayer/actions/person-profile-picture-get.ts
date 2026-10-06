import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

interface Input {
  personProfileUrl: string;
}

/** `GET /person/profile-picture` */
const personProfilePictureGet: ActionDefinition<Input> = {
  key: "person-profile-picture-get",
  type: "read",
  resource: "person",
  title: "Get Person Profile Picture",
  description:
    "Return a temporary URL for a person's profile picture, from a cached profile (free).",
  params: [
    { key: "personProfileUrl", label: "Person profile URL", type: "string", required: true },
  ],
  output: [
    { key: "pictureUrl", type: "string", label: "Temporary picture URL" },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/person/profile-picture", {
      person_profile_url: input.personProfileUrl,
    });
    return {
      pictureUrl: (res as { tmp_profile_pic_url?: string }).tmp_profile_pic_url ?? null,
    };
  },
};

export default personProfilePictureGet;
