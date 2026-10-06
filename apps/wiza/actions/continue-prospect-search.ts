import type { ActionDefinition } from "@w6w/types";
import { compact, dataOf, WizaClient } from "../lib/client.ts";
import { LIST_OUTPUT } from "./get-list.ts";

interface Input {
  id: string | number;
  maxProfiles?: number;
  callbackUrl?: string;
}

const continueProspectSearch: ActionDefinition<Input> = {
  key: "continue-prospect-search",
  type: "perform",
  resource: "list",
  title: "Continue Prospect Search",
  description:
    "Continue a previous prospect search into a new batch (POST /api/prospects/continue_search), reusing the filters of an earlier Create Prospect List. Returns a list to poll with Get List. An unknown list id is HTTP 404 and fails the action; a paused service is a 503, retry shortly.",
  idempotent: false,
  params: [
    {
      key: "id",
      label: "List ID",
      type: "string",
      required: true,
      hint: "The list whose search you want to continue.",
    },
    {
      key: "maxProfiles",
      label: "Max profiles",
      type: "number",
      hint: "Defaults to the previous list's max profiles.",
      validation: { min: 1, integer: true },
    },
    {
      key: "callbackUrl",
      label: "Callback URL",
      type: "string",
      hint: "Defaults to the webhook URL in your account settings.",
    },
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const id = Number(String(input.id ?? "").trim());
    if (!Number.isInteger(id) || id < 1) throw new Error("id must be the numeric list id");
    if (
      input.maxProfiles !== undefined &&
      (!Number.isInteger(input.maxProfiles) || input.maxProfiles < 1)
    ) {
      throw new Error("maxProfiles must be a positive integer");
    }
    const body = await new WizaClient(ctx).call("/api/prospects/continue_search", {
      method: "POST",
      body: compact({ id, max_profiles: input.maxProfiles, callback_url: input.callbackUrl }),
    });
    return dataOf(body);
  },
};

export default continueProspectSearch;
