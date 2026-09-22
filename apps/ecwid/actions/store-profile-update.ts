import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, mergeBody } from "../lib/client.ts";
import { extraFieldsParam } from "../lib/params.ts";

/**
 * `PUT /profile` — update store settings.
 *
 * The request body is the same nested tree `GET /profile` returns, and every
 * field in it is optional: Ecwid merges what you send and answers
 * `{"updateCount": 1}`. So this action exposes the four sections a workflow
 * realistically edits and lets anything else through `extraFields` (which wins
 * on conflict) — the documented top-level keys are `generalInfo`, `account`,
 * `settings`, `mailNotifications`, `phoneNotifications`, `company`,
 * `formatsAndUnits`, `languages`, `shipping`, `zones`, `taxes`, `taxSettings`,
 * `businessRegistrationID`, `legalPagesSettings`, `designSettings`,
 * `productFiltersSettings`, `orderInvoiceSettings`, `socialLinksSettings`,
 * `registrationAnswers` and `tipsSettings`.
 *
 * Marked idempotent: `PUT` of the same body leaves the same state, and a
 * retried request can only re-apply fields the caller already chose.
 */
interface Input {
  settings?: unknown;
  generalInfo?: unknown;
  company?: unknown;
  languages?: unknown;
  extraFields?: unknown;
}

const storeProfileUpdate: ActionDefinition<Input> = {
  key: "store-profile-update",
  type: "perform",
  resource: "store-profile",
  title: "Update Store Profile",
  description:
    "Update store settings, store URL, company details or enabled languages. Fields not sent " +
    "are left untouched.",
  idempotent: true,
  params: [
    {
      key: "settings",
      label: "Settings",
      type: "json",
      hint: 'Storefront settings object, e.g. `{"storeName":"Acme","closed":false}`. Documented ' +
        "keys include `storeName`, `storeDescription`, `closed`, `askZipCode`, `googleAnalyticsId` " +
        "and the marketing-pixel ids.",
    },
    {
      key: "generalInfo",
      label: "General info",
      type: "json",
      hint: 'e.g. `{"storeUrl":"https://acme.example"}` — the store\'s main website URL and ' +
        "its Instant Site settings.",
    },
    {
      key: "company",
      label: "Company",
      type: "json",
      hint: "The physical store's name, phone and address, as returned under `company` by Get " +
        "Store Profile.",
    },
    {
      key: "languages",
      label: "Languages",
      type: "json",
      advanced: true,
      hint: 'e.g. `{"enabledLanguages":["en","nl"],"defaultLanguage":"en"}`. A language ' +
        "must be one the store already has enabled, or Ecwid answers 400 LANGUAGES_NOT_ALLOWED.",
    },
    extraFieldsParam,
  ],
  output: [
    { key: "updateCount", type: "number", label: "1 when the profile was updated" },
  ],

  execute(input, ctx) {
    const body = mergeBody({
      settings: input.settings,
      generalInfo: input.generalInfo,
      company: input.company,
      languages: input.languages,
    }, input.extraFields);
    return new EcwidClient(ctx).json("/profile", { method: "PUT", body });
  },
};

export default storeProfileUpdate;
