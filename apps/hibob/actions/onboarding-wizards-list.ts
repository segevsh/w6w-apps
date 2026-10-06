import type { ActionDefinition } from "@w6w/types";
import { HibobClient } from "../lib/client.ts";

/** `GET /v1/onboarding/wizards` — onboarding wizard ids and names (the id an invitation takes). */
const onboardingWizardsList: ActionDefinition<Record<string, never>> = {
  key: "onboarding-wizards-list",
  type: "read",
  resource: "onboarding",
  title: "List Onboarding Wizards",
  description: "List onboarding wizards (id and name).",
  params: [],
  output: [{ key: "wizards", type: "object", label: "Wizards (id, name)" }],

  async execute(_input, ctx) {
    return await new HibobClient(ctx).get("/onboarding/wizards");
  },
};

export default onboardingWizardsList;
