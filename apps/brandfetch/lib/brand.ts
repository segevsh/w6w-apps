import type { OutputField, Param } from "@w6w/types";
import { BrandfetchClient, compact } from "./client.ts";
import type { ApiResult } from "./client.ts";
import type { HookContext } from "@w6w/types";

/** Output fields shared by every action that returns a brand (Brand API and Transaction API). */
export const BRAND_OUTPUT = [
  { key: "found", type: "boolean", label: "Brand returned" },
  {
    key: "crawlQueued",
    type: "boolean",
    label: "Brand not held yet, now being collected — retry in a minute or two",
  },
  { key: "notIndexed", type: "boolean", label: "Not indexed yet (cachedOnly lookup, HTTP 204)" },
  { key: "id", type: "string", label: "Brand ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "domain", type: "string", label: "Domain" },
  { key: "claimed", type: "boolean", label: "Profile claimed by its owner" },
  { key: "description", type: "string", label: "Description" },
  { key: "longDescription", type: "string", label: "Long description" },
  { key: "logoUrl", type: "string", label: "Best full logo URL (SVG preferred)" },
  { key: "iconUrl", type: "string", label: "Best icon URL (SVG preferred)" },
  { key: "links", type: "array", label: "Social links" },
  { key: "logos", type: "array", label: "Logos, symbols and icons with their formats" },
  { key: "colors", type: "array", label: "Brand colors" },
  { key: "fonts", type: "array", label: "Fonts" },
  { key: "images", type: "array", label: "Banners and pictures" },
  { key: "qualityScore", type: "number", label: "Data quality score (0-1)" },
  { key: "company", type: "object", label: "Company facts: employees, industry, HQ, ticker, ISIN" },
  { key: "isNsfw", type: "boolean", label: "Flagged NSFW" },
  { key: "urn", type: "string", label: "Brandfetch URN" },
] satisfies OutputField[];

interface Format {
  src?: string;
  format?: string;
}
interface Logo {
  type?: string;
  theme?: string | null;
  formats?: Format[];
}

/** First logo of `type` (theme `dark`, for a light background, first), SVG over raster. */
export function pickLogoUrl(logos: unknown, type: "logo" | "icon"): string | undefined {
  if (!Array.isArray(logos)) return undefined;
  const ofType = (logos as Logo[]).filter((l) => l?.type === type);
  const ordered = [
    ...ofType.filter((l) => l.theme === "dark"),
    ...ofType.filter((l) => l.theme !== "dark"),
  ];
  for (const logo of ordered) {
    const formats = logo.formats ?? [];
    const best = formats.find((f) => f.format === "svg") ?? formats.find((f) =>
      f.format === "png"
    ) ??
      formats[0];
    if (best?.src) return best.src;
  }
  return undefined;
}

export function brandOutput(result: ApiResult): Record<string, unknown> {
  if (result.status === 204) return { found: false, notIndexed: true };
  if (result.status === 404) return { found: false, crawlQueued: true };
  const b = (result.body ?? {}) as Record<string, unknown>;
  return {
    found: true,
    ...compact({
      id: b.id,
      name: b.name,
      domain: b.domain,
      claimed: b.claimed,
      description: b.description,
      longDescription: b.longDescription,
      logoUrl: pickLogoUrl(b.logos, "logo"),
      iconUrl: pickLogoUrl(b.logos, "icon"),
      links: b.links,
      logos: b.logos,
      colors: b.colors,
      fonts: b.fonts,
      images: b.images,
      qualityScore: b.qualityScore,
      company: b.company,
      isNsfw: b.isNsfw,
      urn: b.urn,
    }),
  };
}

export const ALLOW_NSFW_PARAM: Param = {
  key: "allowNsfw",
  label: "Allow NSFW brands",
  type: "select",
  hint: "Unset: some NSFW brands are withheld (404), others returned with isNsfw. " +
    "Yes: return the brand regardless. No: withhold every NSFW brand.",
  options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }],
};

export const CACHED_ONLY_PARAM: Param = {
  key: "cachedOnly",
  label: "Cached only",
  type: "boolean",
  default: false,
  hint: "Answer only from Brandfetch's store: a brand not yet indexed comes back as " +
    "`notIndexed` instead of being indexed live (which can take seconds). Not billed.",
};

export interface LookupInput {
  value: string;
  allowNsfw?: string;
  cachedOnly?: boolean;
}

/** Shared body of the five Brand API lookups. */
export async function lookupBrand(
  ctx: HookContext,
  path: string,
  input: { allowNsfw?: string; cachedOnly?: boolean },
): Promise<Record<string, unknown>> {
  const result = await new BrandfetchClient(ctx).request(path, {
    query: {
      allowNsfw: input.allowNsfw === "true" || input.allowNsfw === "false"
        ? input.allowNsfw
        : undefined,
      cachedOnly: input.cachedOnly ? "true" : undefined,
    },
  });
  return brandOutput(result);
}
