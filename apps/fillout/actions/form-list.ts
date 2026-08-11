import type { ActionDefinition } from "@w6w/types";
import { FilloutClient } from "../lib/client.ts";

/**
 * `GET /v1/api/forms` — every form in the account.
 *
 * The response is a **bare JSON array** of `{name, formId}` — no envelope, no
 * pagination, no filter. That is the whole documented contract: the endpoint
 * takes no parameters at all, so an account with 400 forms returns 400 rows and
 * there is no vendor-side way to narrow it. `formCount` is returned alongside
 * so a workflow can branch on size without counting the array itself.
 *
 * This is also the app's credential probe (`auth/api-key.ts`), because it is
 * the only endpoint in Fillout's eight that needs neither an id you do not yet
 * have nor a destructive verb.
 */
interface Output {
  forms: Array<{ name: string; formId: string }>;
  formCount: number;
}

const formList: ActionDefinition<Record<string, never>, Output> = {
  key: "form-list",
  type: "read",
  resource: "form",
  title: "Get Forms",
  description: "List every form in the Fillout account, with its name and public form ID.",
  params: [],
  output: [
    { key: "forms", type: "array", label: "Forms" },
    { key: "formCount", type: "number", label: "Number of forms returned" },
  ],

  async execute(_input, ctx) {
    const forms = await new FilloutClient(ctx).json<Output["forms"]>("/forms");
    const list = Array.isArray(forms) ? forms : [];
    ctx.log("info", "listed Fillout forms", { formCount: list.length });
    return { forms: list, formCount: list.length };
  },
};

export default formList;
