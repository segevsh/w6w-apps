import type { ActionDefinition } from "@w6w/types";
import { compact, SendfoxClient, toIdList } from "../lib/client.ts";

/**
 * `POST /forms` — create a subscription form.
 *
 * `title` and `lists` are both required: a form exists to put subscribers into
 * at least one list, and the document will not create one without it.
 * `redirect_url` (nullable) and `gdpr_required` are optional.
 *
 * The response is the bare `Form` and includes the generated public `url`.
 *
 * A `403` here is specific: it is the **free-plan form limit**, not a
 * permissions problem — the document's own wording for this response is
 * "Forbidden (free user form limit reached)". API access already requires a
 * paid plan, so in practice the limit is the Lifetime/Empire allowance rather
 * than a Free account's one form.
 *
 * Not idempotent: every successful call creates a new form.
 */
interface Input {
  title: string;
  lists: number[];
  redirectUrl?: string;
  gdprRequired?: boolean;
}

const formCreate: ActionDefinition<Input> = {
  key: "form-create",
  type: "perform",
  resource: "form",
  title: "Create Form",
  description: "Create a subscription form attached to one or more lists.",
  idempotent: false,
  params: [
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      hint: "Max 191 characters.",
    },
    {
      key: "lists",
      label: "Lists",
      type: "array",
      required: true,
      item: { type: "number", placeholder: "42" },
      hint: "Required. List ids the form subscribes people to.",
    },
    {
      key: "redirectUrl",
      label: "Redirect URL",
      type: "string",
      placeholder: "https://example.com/thanks",
      hint: "Where to send subscribers after they sign up. Optional.",
    },
    {
      key: "gdprRequired",
      label: "Require GDPR consent",
      type: "boolean",
      hint: "Show a required consent checkbox on the form.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Form id" },
    { key: "title", type: "string", label: "Title" },
    { key: "url", type: "string", label: "Public subscribe URL" },
    { key: "redirect_url", type: "string", label: "Redirect URL" },
    { key: "gdpr_required", type: "boolean", label: "GDPR consent required" },
    { key: "lists", type: "array", label: "Attached lists" },
  ],

  execute(input, ctx) {
    return new SendfoxClient(ctx).json("/forms", {
      method: "POST",
      body: compact({
        title: input.title,
        lists: toIdList(input.lists),
        redirect_url: input.redirectUrl,
        gdpr_required: input.gdprRequired,
      }),
    });
  },
};

export default formCreate;
