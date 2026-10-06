import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

interface Input {
  companyProfileUrl: string;
}

/** `GET /company/profile-picture` */
const companyProfilePictureGet: ActionDefinition<Input> = {
  key: "company-profile-picture-get",
  type: "read",
  resource: "company",
  title: "Get Company Logo",
  description: "Return a temporary URL for a company's logo, from a cached profile (free).",
  params: [
    { key: "companyProfileUrl", label: "Company profile URL", type: "string", required: true },
  ],
  output: [
    { key: "pictureUrl", type: "string", label: "Temporary picture URL" },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/company/profile-picture", {
      company_profile_url: input.companyProfileUrl,
    });
    return {
      pictureUrl: (res as { tmp_profile_pic_url?: string }).tmp_profile_pic_url ?? null,
    };
  },
};

export default companyProfilePictureGet;
