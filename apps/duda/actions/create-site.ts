import type { ActionDefinition } from "@w6w/types";
import { compact, DudaClient } from "../lib/client.ts";

interface Input {
  templateAlias?: string;
  defaultDomainPrefix?: string;
  lang?: string;
  url?: string;
  doNotGenSsl?: boolean;
  importPlatformType?: string;
}

/**
 * `POST /api/sites/multiscreen/create` — "Create site".
 *
 * The documented body (`DudaOneCreateNoMigrationRDT`) marks everything
 * optional, which is true of the schema and false in practice: a site has to be
 * built *from* something, so `template_alias` is the field that makes this
 * action useful and each of the others only steers the result.
 *
 * `template_alias` is preferred over `template_id` on Duda's own instruction —
 * the schema description on `template_id` says outright "Deprecated, use
 * 'template_alias'". Only the alias is exposed here.
 *
 * The response is `SiteIDRDT` — `{ site_name }` — and Duda's docs ask that the
 * alias be stored, because it is unique across all Duda sites and is the key
 * for every later call. The raw body is returned rather than an unwrapped
 * string so a caller sees exactly what the vendor sent.
 */
const createSite: ActionDefinition<Input> = {
  key: "create-site",
  type: "perform",
  resource: "site",
  title: "Create Site",
  description:
    "Create a site from a template. Duda's own rate limit for this endpoint is 60 calls/minute, " +
    "on top of the global 10 calls/second.",
  idempotent: false,
  params: [
    {
      key: "templateAlias",
      label: "Template alias",
      type: "string",
      placeholder: "my-template-alias",
      hint: "Alias of the template to build from. Without one Duda has nothing to build the site " +
        "from, so this is effectively required.",
    },
    {
      key: "defaultDomainPrefix",
      label: "Default domain prefix",
      type: "string",
      advanced: true,
      placeholder: "my-agency-site",
      hint: "Prefix for the free `*.dudaone.com` address the new site gets.",
    },
    {
      key: "lang",
      label: "Language",
      type: "string",
      advanced: true,
      placeholder: "en",
      hint: "Site language code (Duda's list: en, en_gb, fr, de, es, pt, it, nl, ja, tr, pl, ar, " +
        "id).",
    },
    {
      key: "url",
      label: "Business site URL",
      type: "string",
      advanced: true,
      placeholder: "https://acme.com",
      hint: "An existing business site for Duda to seed content from.",
    },
    {
      key: "doNotGenSsl",
      label: "Skip SSL generation",
      type: "boolean",
      advanced: true,
      default: false,
      hint: "Set when you will handle certificates yourself.",
    },
    {
      key: "importPlatformType",
      label: "Import platform type",
      type: "string",
      advanced: true,
      hint: "Optional query parameter for Duda's content-migration flow.",
    },
  ],
  output: [
    { key: "site_name", type: "string", label: "Alias of the new site" },
  ],

  async execute(input, ctx) {
    const body = compact({
      template_alias: input.templateAlias,
      default_domain_prefix: input.defaultDomainPrefix,
      lang: input.lang,
      url: input.url,
      // `false` is meaningful here, but the documented default is the same, so
      // an unset boolean is sent as absence rather than as `false`.
      do_not_gen_ssl: input.doNotGenSsl === true ? true : undefined,
    });
    return await new DudaClient(ctx).request("/api/sites/multiscreen/create", {
      method: "POST",
      query: { import_platform_type: input.importPlatformType },
      body,
    });
  },
};

export default createSite;
