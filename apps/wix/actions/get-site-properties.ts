import type { ActionDefinition } from "@w6w/types";
import { WixClient } from "../lib/client.ts";

// deno-lint-ignore no-empty-interface
interface Input {}

/**
 * `GET /site-properties/v4/properties` — handler
 * `wix.siteproperties.v4.properties:Read`.
 *
 * Also the auth `test` probe: it is the cheapest site-level read Wix offers and
 * needs no product to be installed, so it works on a brand-new site with an
 * empty CMS and no store.
 */
const getSiteProperties: ActionDefinition<Input> = {
  key: "get-site-properties",
  type: "read",
  resource: "site",
  title: "Get Site Properties",
  description:
    "Read the connected site's own properties — display name, locale, time zone, currency, business contact and schedule.",
  params: [],
  output: [{ key: "properties", type: "object", label: "Site properties" }],

  execute(_input, ctx) {
    return new WixClient(ctx).request("/site-properties/v4/properties");
  },
};

export default getSiteProperties;
