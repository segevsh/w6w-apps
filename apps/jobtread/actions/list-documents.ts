import type { ActionDefinition } from "@w6w/types";
import { connectionArgs, JobTreadClient } from "../lib/client.ts";

interface Input {
  organizationId: string;
  size?: number;
  page?: string;
  where?: unknown;
  sortBy?: unknown;
}

interface DocumentNode {
  id: string;
  name: string;
  number: string | null;
  type: string;
  status: string;
  price: number | null;
  cost: number | null;
  tax: number | null;
  createdAt: string;
  job: { id: string; name: string } | null;
}

interface OrganizationDocumentsResponse {
  organization: {
    documents: { nodes: DocumentNode[]; nextPage: string | null };
  } | null;
}

const listDocuments: ActionDefinition<Input> = {
  key: "list-documents",
  type: "search",
  resource: "document",
  title: "List Documents",
  description:
    "List an organization's billing documents — bids, orders, bills, and invoices " +
    "(organization.documents). `type` is one of `bidRequest`, `vendorOrder`, `customerOrder`, " +
    "`vendorBill`, `customerInvoice` (from JobTread's own documented examples); `status` is " +
    "vendor-defined per type (`draft`, `pending`, `approved`, … also from documented examples). " +
    "Fields confirmed live 2026-09-15; the type/status vocabulary is corroborated, not " +
    "independently live-probed, since it isn't itself a required argument to trigger a " +
    "validation error — filter on it explicitly if you rely on it.",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    { key: "size", label: "Page Size", type: "number", default: 25 },
    { key: "page", label: "Page Cursor", type: "string", hint: "From a previous call's nextPage." },
    {
      key: "where",
      label: "Filter",
      type: "json",
      hint: 'Pave filter, e.g. `["type", "=", "customerInvoice"]`, or `{"and": [["type","=",' +
        '"customerInvoice"], ["status","=","pending"]]}`.',
    },
    { key: "sortBy", label: "Sort", type: "json", hint: 'JSON array of `{"field": "createdAt", "order": "desc"}`.' },
  ],
  output: [
    { key: "nodes", type: "array", label: "Documents" },
    { key: "nextPage", type: "string", label: "Next Page Cursor" },
  ],

  async execute(input, ctx) {
    const client = new JobTreadClient(ctx);
    const res = await client.query<OrganizationDocumentsResponse>({
      organization: {
        $: { id: input.organizationId },
        documents: {
          $: connectionArgs(input),
          nextPage: {},
          nodes: {
            id: {},
            name: {},
            number: {},
            type: {},
            status: {},
            price: {},
            cost: {},
            tax: {},
            createdAt: {},
            job: { id: {}, name: {} },
          },
        },
      },
    });
    if (!res.organization) throw new Error(`organization ${input.organizationId} not found`);
    return res.organization.documents;
  },
};

export default listDocuments;
