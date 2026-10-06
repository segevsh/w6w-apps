import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, customFields, pick, RaiselyClient, seg } from "../lib/client.ts";
import { customFieldParams, overwriteParam, privateParam } from "../lib/params.ts";

interface Input {
  campaign: string;
  private?: boolean;
  name?: string;
  path?: string;
  goal?: number;
  currency?: string;
  mode?: string;
  theme?: string;
  version?: string;
  defaultDesignation?: string;
  primaryDomain?: string;
  allowExperiments?: boolean;
  urls?: string | string[];
  public?: string | Record<string, unknown>;
  private_fields?: string | Record<string, unknown>;
  overwriteCustomFields?: boolean;
}

const campaignUpdate: ActionDefinition<Input> = {
  key: "campaign-update",
  type: "perform",
  resource: "campaign",
  title: "Update Campaign",
  description: "Update a campaign's name, goal, currency, mode, domain or custom fields.",
  idempotent: true,
  params: [
    {
      key: "campaign",
      label: "Campaign",
      type: "string",
      required: true,
      hint: "The uuid, path or domain of the campaign.",
    },
    { key: "name", label: "Name", type: "string" },
    { key: "path", label: "Path", type: "string", hint: "Changing it changes the campaign's URL." },
    { key: "goal", label: "Goal (cents)", type: "number", validation: { integer: true, min: 0 } },
    { key: "currency", label: "Currency", type: "string", hint: "3 letter currency code." },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      options: [{ value: "LIVE", label: "Live" }, { value: "TEST", label: "Test" }],
      hint: "Set to LIVE before launching — TEST does not process real payments.",
    },
    { key: "theme", label: "Theme", type: "string" },
    { key: "version", label: "Theme version", type: "string" },
    { key: "defaultDesignation", label: "Default designation", type: "string" },
    { key: "primaryDomain", label: "Primary domain", type: "string" },
    { key: "allowExperiments", label: "Allow experiments", type: "boolean" },
    { key: "urls", label: "Custom domains", type: "json", hint: "JSON array of domains." },
    ...customFieldParams(),
    overwriteParam(),
    privateParam(),
  ],
  output: [
    { key: "uuid", type: "string", label: "Campaign uuid" },
    { key: "path", type: "string", label: "Path" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const data = compact({
      ...pick(input, [
        "name",
        "path",
        "goal",
        "currency",
        "mode",
        "theme",
        "version",
        "defaultDesignation",
        "primaryDomain",
        "allowExperiments",
      ]),
      urls: asOptionalJson<string[]>(input.urls, "urls"),
      ...customFields(input),
    });
    return await new RaiselyClient(ctx).data(`/campaigns/${seg(input.campaign)}`, {
      method: "PATCH",
      query: compact({ private: input.private }),
      body: compact({ data, overwriteCustomFields: input.overwriteCustomFields }),
    });
  },
};

export default campaignUpdate;
