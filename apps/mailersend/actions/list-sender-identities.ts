import type { ActionDefinition } from "@w6w/types";
import {
  DOMAIN_ID_FILTER,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";
import { listOf } from "../lib/factories.ts";

interface Input extends PageInput, Record<string, unknown> {
  domainId?: string;
  query?: string;
  orderBy?: string;
  order?: string;
}

const listSenderIdentities: ActionDefinition<Input> = listOf<Input>({
  key: "list-sender-identities",
  resource: "sender-identity",
  title: "List Sender Identities",
  description:
    "List sender identities, the verified from-addresses that work without verifying a whole domain (GET /v1/identities).",
  path: () => "/identities",
  params: [
    DOMAIN_ID_FILTER,
    { key: "query", label: "Email contains", type: "string", hint: "Filter by email address." },
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: ["email", "created_at", "verified_at"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "order",
      label: "Direction",
      type: "select",
      options: ["asc", "desc"].map((v) => ({ value: v, label: v })),
    },
    ...PAGE_PARAMS,
  ],
  query: (i) => ({
    ...pageQuery(i),
    domain_id: i.domainId,
    query: i.query,
    order_by: i.orderBy,
    order: i.order,
  }),
  output: PAGE_OUTPUT,
});

export default listSenderIdentities;
