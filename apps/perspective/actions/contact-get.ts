import type { ActionDefinition } from "@w6w/types";
import { encodeId, PerspectiveClient, requireString } from "../lib/client.ts";
import { contactIdParam, funnelIdParam } from "../lib/params.ts";

/** `GET /v1/funnels/{funnelId}/contacts/{contactId}` — one contact. */
interface Input {
  funnelId: string;
  contactId: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one CRM contact, including UTM parameters and custom properties.",
  params: [funnelIdParam, contactIdParam],
  output: [{ key: "data", type: "object", label: "The contact" }],

  async execute(input, ctx) {
    const funnelId = encodeId(requireString(input.funnelId, "funnelId"));
    const contactId = encodeId(requireString(input.contactId, "contactId"));
    const data = await new PerspectiveClient(ctx).data(
      `/funnels/${funnelId}/contacts/${contactId}`,
    );
    return { data };
  },
};

export default contactGet;
