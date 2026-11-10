import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import brandingList from "../actions/branding-list.ts";

interface Params {
  organizationId?: string;
}

// VideoAsk: GET /brandings "Brandings are sorted by creation date in descending order"
// (https://developers.videoask.com/, Branding > Retrieve brands, verified 2026-11-10). Newest-first,
// brief 9.1 a. `logo_url` is a signed media URL (its query string carries a `token`), so it is
// stripped from the emitted record.
export default pollFromListAction<Params>({
  key: "new-brand",
  title: "New Brand",
  description: "The run gets each newly created brand (custom logo, domain and colors).",
  action: brandingList as unknown as ActionDefinition,
  input: ({ organizationId }) => ({ organizationId }),
  items: (result) =>
    ((result as { results?: Record<string, unknown>[] }).results ?? []).map((b) => {
      const { logo_url: _signed, ...rest } = b;
      return rest;
    }),
  idOf: (item) => String((item as { branding_id?: unknown }).branding_id ?? ""),
  params: [{ key: "organizationId", label: "Organization ID", type: "string" }],
  output: [
    { key: "branding_id", type: "string", label: "Brand ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "branding_url", type: "string", label: "Brand URL" },
    { key: "custom_domain", type: "string", label: "Custom domain" },
  ],
  sample: {
    branding_id: "brand_1",
    name: "Brand 1",
    branding_url: "https://acme.example",
    custom_domain: "ask.acme.example",
  },
  maxPages: 1,
});
