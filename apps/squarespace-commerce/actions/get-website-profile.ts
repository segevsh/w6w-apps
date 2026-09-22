import type { ActionDefinition } from "@w6w/types";
import { API_V1, SquarespaceClient } from "../lib/client.ts";

/**
 * `GET /1.0/authorization/website` — the merchant website the credential belongs
 * to.
 *
 * This is the app's whoami, and it is also the auth probe and the derived
 * `auth:api-key` health check: its response is site settings and contains no
 * credential material of any kind (verified live 2026-09-22 — the documented
 * `WebsiteProfile` fields are `currency`, `id`, `language`, `location`,
 * `measurementStandard`, `siteId`, `timeZone`, `title` and `url`, and nothing
 * else). A bad or missing key answers `401 AUTHORIZATION_ERROR`, whose body does
 * not echo the key either.
 *
 * Useful beyond "did my connection work": `currency` and
 * `measurementStandard` are the units every order and product in this API is
 * denominated in, and `siteId` is what a subsequent support conversation needs.
 */
export interface WebsiteProfile {
  currency?: string;
  id?: string;
  language?: string;
  location?: { country?: string; region?: string };
  measurementStandard?: string;
  siteId?: string;
  timeZone?: string;
  title?: string;
  url?: string;
}

const getWebsiteProfile: ActionDefinition<Record<string, never>, WebsiteProfile> = {
  key: "get-website-profile",
  type: "read",
  resource: "website",
  title: "Get Website Profile",
  description: "Retrieve the website the connected API key belongs to: its title, URL, currency, " +
    "language, time zone and measurement standard. Takes no parameters.",
  params: [],
  output: [
    { key: "id", type: "string", label: "Website id" },
    { key: "siteId", type: "string", label: "Site id" },
    { key: "title", type: "string", label: "Website title" },
    { key: "url", type: "string", label: "Website URL" },
    { key: "currency", type: "string", label: "Currency code" },
    { key: "language", type: "string", label: "Language" },
    { key: "timeZone", type: "string", label: "Time zone" },
    { key: "measurementStandard", type: "string", label: "`IMPERIAL` or `METRIC`" },
    { key: "location", type: "object", label: "Location (`country`, `region`)" },
  ],

  execute(_input, ctx) {
    return new SquarespaceClient(ctx).get<WebsiteProfile>(`${API_V1}/authorization/website`);
  },
};

export default getWebsiteProfile;
