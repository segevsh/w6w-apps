import type { ActionDefinition } from "@w6w/types";
import { assertCredential, query, StoryblokClient } from "../lib/client.ts";

/**
 * `GET /v2/cdn/datasource_entries` — the key/value lists a space keeps outside
 * its content.
 *
 * ## What a datasource is for
 *
 * Country codes, currencies, plan names, the options in a dropdown — data that
 * editors choose *from* rather than write. A story field bound to a datasource
 * stores the value; the label lives here.
 *
 * That is the practical reason to fetch them: a story whose `country` field
 * says `de` needs this list to say "Germany", and a workflow that renders
 * content without it produces machine codes in front of a customer.
 *
 * ## Dimensions are how a datasource is translated
 *
 * A datasource entry has one value plus a value per **dimension**, which is
 * usually a language. Asking for a dimension replaces the values with that
 * dimension's; not asking gets the default. A missing translation falls back
 * silently, so a partially-translated datasource looks complete.
 *
 * ## `per_page` goes to 1000 here
 *
 * Unlike stories, whose ceiling is 100. Datasource entries are small, and a
 * list of every currency in one request is reasonable.
 */
const action: ActionDefinition = {
  key: "datasource-entry-list",
  type: "read",
  resource: "datasource-entry",
  title: "List datasource entries",
  description:
    "The key/value lists a space keeps outside its content — country codes, plan names, dropdown " +
    "options. A story stores the VALUE, so this is what turns `de` into `Germany`. Dimensions " +
    "are translations, and a missing one falls back silently.",
  params: [
    {
      key: "datasource",
      label: "Datasource",
      type: "string",
      required: true,
      default: "",
      placeholder: "countries",
      hint: "The datasource's slug.",
    },
    {
      key: "dimension",
      label: "Dimension",
      type: "string",
      default: "",
      hint: "Usually a language code. A missing translation falls back to the default value with " +
        "no indication.",
    },
    { key: "perPage", label: "Per page", type: "number", default: 1000 },
    { key: "page", label: "Page", type: "number", default: 1 },
    { key: "cacheVersion", label: "Cache version", type: "number", default: 0, advanced: true },
  ],
  output: [
    { key: "entries", type: "array", label: "The entries" },
    { key: "count", type: "number", label: "How many" },
    { key: "total", type: "number", label: "How many in all" },
    { key: "map", type: "object", label: "Value to name, ready to look up" },
    { key: "values", type: "array", label: "Just the values" },
    { key: "dimension", type: "string", label: "Which dimension was asked for" },
    { key: "cv", type: "number", label: "Pass this to the next call" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    assertCredential(ctx.connection, "delivery");

    const datasource = String(p.datasource ?? "").trim();
    if (!datasource) throw new Error("`datasource` is required");
    const dimension = String(p.dimension ?? "").trim();

    const result = await new StoryblokClient(ctx).delivery<{
      datasource_entries?: Array<{
        id?: number;
        name?: string;
        value?: string;
        dimension_value?: string | null;
      }>;
      cv?: number;
    }>("/datasource_entries", {
      query: query({
        datasource,
        dimension: dimension || undefined,
        per_page: Math.max(1, Math.min(1000, Number(p.perPage ?? 1000))),
        page: Math.max(1, Number(p.page ?? 1)),
        cv: Number(p.cacheVersion ?? 0) || undefined,
      }),
    });

    const entries = result.data?.datasource_entries ?? [];

    // The lookup a caller actually wants, rather than an array to walk.
    const map: Record<string, string> = {};
    for (const entry of entries) {
      const value = String(entry?.value ?? "");
      if (!value) continue;
      map[value] = String(entry?.dimension_value ?? entry?.name ?? "");
    }

    if (dimension) {
      const untranslated = entries.filter((entry) => !entry?.dimension_value).length;
      if (untranslated) {
        ctx.log(
          "info",
          `${untranslated} entries have no value in the \`${dimension}\` dimension and fall back ` +
            "to the default — which is indistinguishable from being translated to the same text",
          { datasource, dimension },
        );
      }
    }

    return {
      entries,
      count: entries.length,
      total: result.total,
      map,
      values: entries.map((entry) => entry?.value).filter(Boolean),
      dimension: dimension || undefined,
      cv: result.cv,
    };
  },
};

export default action;
