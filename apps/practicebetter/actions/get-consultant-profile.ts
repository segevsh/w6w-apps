import type { ActionDefinition } from "@w6w/types";
import { PracticeBetterClient } from "../lib/client.ts";

/**
 * `GET /consultant/profile` — the authenticated consultant's own profile.
 *
 * Security: `[read]`. Optional query `as_consultant` names another consultant to
 * read instead, where the caller may act for several.
 *
 * The response carries `id`, `emailAddress`, `activationStatus`, `isOwner`,
 * `isAssistant`, `dateCreated`, `dateModified` and a `company` object. The eight
 * fields declared in `output` are the ones a workflow keys off; the rest passes
 * through untouched. `auth/client-credentials.ts`'s `afterConnect` reuses this
 * same call (unscoped) to label the Connection — no new endpoint, no new failure
 * mode.
 *
 * **Non-standard status worth knowing about:** the document declares **`461
 * Resource Access Denied`** on this operation alongside the usual
 * `401`/`403`/`404`. It is not a new error class and is not special-cased: any
 * non-2xx is a failure the normal way and the status appears in the thrown
 * message. It is called out here so a run log showing `HTTP 461` is recognised.
 */
interface Input {
  as_consultant?: string;
}

const getConsultantProfile: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-consultant-profile",
  type: "read",
  resource: "consultant",
  title: "Get Consultant Profile",
  description:
    "Read the authenticated consultant's profile — email, activation status, owner/assistant flags " +
    "and the company object.",
  params: [
    {
      key: "as_consultant",
      label: "As consultant ID",
      type: "string",
      advanced: true,
      hint: "Read this other consultant's profile instead, where the caller may act for several.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Consultant ID" },
    { key: "emailAddress", type: "string", label: "Email address" },
    { key: "activationStatus", type: "string", label: "Activation status" },
    { key: "isOwner", type: "boolean", label: "Account owner" },
    { key: "isAssistant", type: "boolean", label: "Assistant" },
    { key: "dateCreated", type: "string", label: "Created at" },
    { key: "dateModified", type: "string", label: "Last modified at" },
    { key: "company", type: "object", label: "The company the consultant belongs to" },
  ],

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).request("/consultant/profile", {
      query: { as_consultant: input.as_consultant },
    });
  },
};

export default getConsultantProfile;
