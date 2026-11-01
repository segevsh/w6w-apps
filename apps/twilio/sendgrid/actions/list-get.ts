import type { ActionDefinition } from "@w6w/types";

/**
 * Fetch a single Marketing Campaigns list.
 * Wraps `GET /v3/marketing/lists/{id}` with an optional `contact_sample` flag.
 */
const action: ActionDefinition = {
  key: "list-get",
  type: "perform",
  resource: "list",
  title: "Get a list",
  description: "Get a list by ID",
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      default: "",
      hint: "ID of the list",
    },
    {
      key: "contactSample",
      label: "Contact Sample",
      type: "boolean",
      default: false,
      hint: "Whether to return a sample of contacts on the list",
    },
  ],

  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "List name" },
    { key: "contact_count", type: "number", label: "Contact count" },
    { key: "_metadata.self", type: "string", label: "Self URL" },
    { key: "contact_sample", type: "array", label: "Sample contacts" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listId = String(p.listId ?? "").trim();
    if (!listId) throw new Error("`listId` is required");

    const contactSample = p.contactSample === true;
    const qs = new URLSearchParams();
    qs.set("contact_sample", contactSample ? "true" : "false");

    const url = `https://api.sendgrid.com/v3/marketing/lists/${
      encodeURIComponent(listId)
    }?${qs.toString()}`;

    ctx.log("info", "fetching SendGrid list", { listId, contactSample });

    const res = await ctx.fetch(url, { method: "GET" });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SendGrid list get returned ${res.status}: ${errText}`);
    }

    return await res.json();
  },
};

export default action;
