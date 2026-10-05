import type { ActionDefinition } from "@w6w/types";
import { BitwardenClient, intEnum, POLICY_TYPE_NAMES } from "../lib/client.ts";
import { shapePolicy } from "../lib/shape.ts";

const POLICY_OPTIONS = [
  { value: "0", label: "TwoFactorAuthentication" },
  { value: "1", label: "MasterPassword" },
  { value: "2", label: "PasswordGenerator" },
  { value: "3", label: "SingleOrg" },
  { value: "4", label: "RequireSso" },
  { value: "5", label: "OrganizationDataOwnership" },
  { value: "6", label: "DisableSend" },
  { value: "7", label: "SendOptions" },
  { value: "8", label: "ResetPassword" },
  { value: "9", label: "MaximumVaultTimeout" },
  { value: "10", label: "DisablePersonalVaultExport" },
  { value: "11", label: "ActivateAutofill" },
  { value: "12", label: "AutomaticAppLogIn" },
  { value: "13", label: "FreeFamiliesSponsorshipPolicy" },
  { value: "14", label: "RemoveUnlockWithPin" },
  { value: "15", label: "RestrictedItemTypesPolicy" },
  { value: "16", label: "UriMatchDefaults" },
  { value: "17", label: "AutotypeDefaultSetting" },
  { value: "18", label: "AutomaticUserConfirmation" },
  { value: "19", label: "BlockClaimedDomainAccountCreation" },
  { value: "20", label: "OrganizationUserNotification" },
  { value: "21", label: "SendControls" },
  { value: "22", label: "FillAssist" },
];

const action: ActionDefinition = {
  key: "policy-get",
  type: "read",
  resource: "policy",
  title: "Get a policy",
  description:
    "One policy by its numeric type. `data` is a free-form object whose shape depends on the type.",
  params: [
    {
      key: "type",
      label: "Policy type",
      type: "select",
      required: true,
      default: "0",
      options: POLICY_OPTIONS,
    },
  ],
  output: [
    { key: "policy", type: "object", label: "The policy as returned" },
    { key: "id", type: "string", label: "Policy id" },
    { key: "type", type: "number", label: "Policy type number" },
    { key: "typeName", type: "string", label: "Policy type name" },
    { key: "enabled", type: "boolean", label: "Whether enforced" },
    { key: "data", type: "object", label: "Per-type configuration" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const type = intEnum(p.type, "type", POLICY_TYPE_NAMES);
    if (type === undefined) throw new Error("`type` is required");
    return shapePolicy(await new BitwardenClient(ctx).request(`/policies/${type}`));
  },
};

export default action;
