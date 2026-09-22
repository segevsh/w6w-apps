import type { ActionDefinition } from "@w6w/types";
import { EcwidClient } from "../lib/client.ts";
import { responseFieldsParam } from "../lib/params.ts";

/**
 * `GET /profile` — the whole store profile.
 *
 * This is the one read that always succeeds for a correctly-connected store,
 * which is why the auth probe uses it too (`auth/api-key.ts`). Its response is a
 * single object with nested sections rather than a list, so there is no page to
 * unwrap: `generalInfo` holds the store's website/platform, `settings` the
 * storefront switches, `company` the physical address, `languages` the enabled
 * and default languages and `formatsAndUnits` the measurement formats.
 *
 * `showExtendedInfo` is **off by default** and labelled as such: the docs say it
 * "Requires `read_store_profile_extended` access scope", so turning it on with
 * a narrower app answers `403 INSUFFICIENT_APP_SCOPE` rather than more data.
 */
interface Input {
  showExtendedInfo?: boolean;
  lang?: string;
  responseFields?: string;
}

const storeProfileGet: ActionDefinition<Input> = {
  key: "store-profile-get",
  type: "read",
  resource: "store-profile",
  title: "Get Store Profile",
  description:
    "Read the store profile: general info, storefront settings, company address, languages and " +
    "formats and units.",
  params: [
    {
      key: "showExtendedInfo",
      label: "Extended info",
      type: "boolean",
      hint: "Off by default. Adds account and billing data to the response and requires the " +
        "`read_store_profile_extended` scope on the custom app — without it Ecwid answers 403.",
    },
    {
      key: "lang",
      label: "Language",
      type: "string",
      placeholder: "en",
      hint:
        "ISO 639-1 code for translated fields such as `title` and `description`. Defaults to the " +
        "store's own default language. Active languages are in `languages.enabledLanguages` of " +
        "this same response.",
    },
    responseFieldsParam,
  ],
  output: [
    { key: "generalInfo", type: "object", label: "Store id, website URL and platform" },
    { key: "settings", type: "object", label: "Storefront settings" },
    { key: "company", type: "object", label: "Company name, phone and address" },
    { key: "languages", type: "object", label: "Enabled, default and required languages" },
    { key: "formatsAndUnits", type: "object", label: "Measurement formats and units" },
  ],

  execute(input, ctx) {
    return new EcwidClient(ctx).json("/profile", {
      query: {
        showExtendedInfo: input.showExtendedInfo,
        lang: input.lang,
        responseFields: input.responseFields,
      },
    });
  },
};

export default storeProfileGet;
