import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  dataOf,
  EMAIL_OPTION_PARAMS,
  ENRICHMENT_OPTIONS,
  GENERIC_EMAIL_PARAM,
  parseJson,
  WizaClient,
} from "../lib/client.ts";
import { LIST_OUTPUT } from "./get-list.ts";

interface Input {
  name: string;
  enrichmentLevel: "none" | "partial" | "full";
  items: unknown;
  acceptWork?: boolean;
  acceptPersonal?: boolean;
  acceptGeneric?: boolean;
  skipDuplicates?: boolean;
  callbackUrl?: string;
}

export function validItem(item: unknown): boolean {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  const i = item as Record<string, unknown>;
  const has = (k: string) => typeof i[k] === "string" && (i[k] as string).trim() !== "";
  return has("profile_url") || has("email") ||
    (has("full_name") && (has("company") || has("domain")));
}

const createList: ActionDefinition<Input> = {
  key: "create-list",
  type: "perform",
  resource: "list",
  title: "Create List",
  description:
    "Create a list of people to enrich (POST /api/lists): up to 2500 items, each a LinkedIn profile URL, an email, or a full name with a company or domain. Asynchronous: returns the list at once with its status; poll Get List, then read Get List Contacts. A completed list also posts to the webhook. Not every list succeeds (LinkedIn rate limiting).",
  idempotent: false,
  params: [
    { key: "name", label: "List name", type: "string", required: true },
    {
      key: "enrichmentLevel",
      label: "Enrichment level",
      type: "select",
      required: true,
      default: "partial",
      options: ENRICHMENT_OPTIONS,
    },
    {
      key: "items",
      label: "Items",
      type: "json",
      required: true,
      hint:
        'Array of up to 2500 objects, each {"profile_url"}, {"email"}, or {"full_name","company" or "domain"}, e.g. [{"full_name":"Stephen Hakami","domain":"wiza.co"},{"email":"stephen@wiza.co"}].',
    },
    { ...EMAIL_OPTION_PARAMS[0], default: true },
    { ...EMAIL_OPTION_PARAMS[1], default: true },
    { ...GENERIC_EMAIL_PARAM, default: true },
    {
      key: "skipDuplicates",
      label: "Skip duplicates",
      type: "boolean",
      hint: "Skip contacts already in recently completed lists in the API folder.",
    },
    {
      key: "callbackUrl",
      label: "Callback URL",
      type: "string",
      hint: "Receives the list update. Defaults to the webhook URL in your account settings.",
    },
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const items = parseJson(input.items, "items");
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("items must be a non-empty array");
    }
    if (items.length > 2500) throw new Error(`items holds ${items.length}; the limit is 2500`);
    items.forEach((item, n) => {
      if (!validItem(item)) {
        throw new Error(
          `items[${n}] needs a profile_url, an email, or a full_name with a company or domain`,
        );
      }
    });
    const accept_work = input.acceptWork ?? true;
    const accept_personal = input.acceptPersonal ?? true;
    if (!accept_work && !accept_personal) {
      throw new Error("accept either work or personal emails");
    }
    const body = await new WizaClient(ctx).call("/api/lists", {
      method: "POST",
      body: {
        list: compact({
          name: input.name,
          enrichment_level: input.enrichmentLevel ?? "partial",
          email_options: {
            accept_work,
            accept_personal,
            accept_generic: input.acceptGeneric ?? true,
          },
          items,
          callback_url: input.callbackUrl,
          skip_duplicates: input.skipDuplicates,
        }),
      },
    });
    return dataOf(body);
  },
};

export default createList;
