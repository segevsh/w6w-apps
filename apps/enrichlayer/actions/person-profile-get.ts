import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

interface Input {
  profileUrl?: string;
  twitterProfileUrl?: string;
  facebookProfileUrl?: string;
  extra?: string;
  githubProfileId?: string;
  facebookProfileId?: string;
  twitterProfileId?: string;
  personalContactNumber?: string;
  personalEmail?: string;
  skills?: string;
  useCache?: string;
  fallbackToCache?: string;
  liveFetch?: string;
}

/** `GET /profile` */
const personProfileGet: ActionDefinition<Input> = {
  key: "person-profile-get",
  type: "read",
  resource: "person",
  title: "Get Person Profile",
  description:
    "Return the structured profile of a person from their public profile, Twitter/X or Facebook URL (1 credit). Optional enrichments (personal email, personal phone, extra details, social IDs) cost extra credits each.",
  params: [
    {
      key: "profileUrl",
      label: "Profile URL",
      type: "string",
      hint:
        "Public profile URL. One of the profile URL, Twitter/X URL or Facebook URL is required.",
    },
    {
      key: "twitterProfileUrl",
      label: "Twitter/X profile URL",
      type: "string",
      hint: "Format https://x.com/<public-identifier>.",
    },
    {
      key: "facebookProfileUrl",
      label: "Facebook profile URL",
      type: "string",
      hint: "Format https://facebook.com/<public-identifier>.",
    },
    {
      key: "extra",
      label: "Extra details",
      type: "select",
      hint: "include adds gender, birth date, industry and interests for 1 extra credit.",
      options: [{ value: "exclude", label: "exclude" }, { value: "include", label: "include" }],
    },
    {
      key: "githubProfileId",
      label: "GitHub profile ID",
      type: "select",
      hint: "include costs 1 extra credit if available.",
      options: [{ value: "exclude", label: "exclude" }, { value: "include", label: "include" }],
    },
    {
      key: "facebookProfileId",
      label: "Facebook profile ID",
      type: "select",
      hint: "include costs 1 extra credit if available.",
      options: [{ value: "exclude", label: "exclude" }, { value: "include", label: "include" }],
    },
    {
      key: "twitterProfileId",
      label: "Twitter profile ID",
      type: "select",
      hint: "include costs 1 extra credit if available.",
      options: [{ value: "exclude", label: "exclude" }, { value: "include", label: "include" }],
    },
    {
      key: "personalContactNumber",
      label: "Personal numbers",
      type: "select",
      hint: "include costs 1 extra credit per number returned.",
      options: [{ value: "exclude", label: "exclude" }, { value: "include", label: "include" }],
    },
    {
      key: "personalEmail",
      label: "Personal emails",
      type: "select",
      hint: "include costs 1 extra credit per email returned.",
      options: [{ value: "exclude", label: "exclude" }, { value: "include", label: "include" }],
    },
    {
      key: "skills",
      label: "Skills",
      type: "select",
      hint: "Deprecated by the vendor; limited coverage, no charge.",
      options: [{ value: "exclude", label: "exclude" }, { value: "include", label: "include" }],
    },
    {
      key: "useCache",
      label: "Cache freshness",
      type: "select",
      hint:
        "if-present reads the cache whatever its age; if-recent makes a best effort at a profile no older than 29 days and costs 1 extra credit. Omit for the vendor default.",
      options: [{ value: "if-present", label: "if-present" }, {
        value: "if-recent",
        label: "if-recent",
      }],
    },
    {
      key: "fallbackToCache",
      label: "Fall back to cache",
      type: "select",
      hint:
        "Whether to read the cached profile when a fresh fetch fails (vendor default on-error).",
      options: [{ value: "on-error", label: "on-error" }, { value: "never", label: "never" }],
    },
    {
      key: "liveFetch",
      label: "Live fetch",
      type: "select",
      hint: "force always fetches a fresh profile and costs 9 extra credits.",
      options: [{ value: "default", label: "default" }, { value: "force", label: "force" }],
    },
  ],
  output: [
    { key: "profile", type: "object", label: "Person profile (the full response body)" },
    { key: "fullName", type: "string", label: "Full name" },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/profile", {
      profile_url: input.profileUrl,
      twitter_profile_url: input.twitterProfileUrl,
      facebook_profile_url: input.facebookProfileUrl,
      extra: input.extra,
      github_profile_id: input.githubProfileId,
      facebook_profile_id: input.facebookProfileId,
      twitter_profile_id: input.twitterProfileId,
      personal_contact_number: input.personalContactNumber,
      personal_email: input.personalEmail,
      skills: input.skills,
      use_cache: input.useCache,
      fallback_to_cache: input.fallbackToCache,
      live_fetch: input.liveFetch,
    });
    return {
      profile: res,
      fullName: (res as { full_name?: string }).full_name ?? null,
    };
  },
};

export default personProfileGet;
