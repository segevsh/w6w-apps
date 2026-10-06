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
  type: string;
  domainId?: string;
}

export const SUPPRESSION_LISTS = [
  { value: "blocklist", label: "Blocklist" },
  { value: "hard-bounces", label: "Hard bounces" },
  { value: "spam-complaints", label: "Spam complaints" },
  { value: "unsubscribes", label: "Unsubscribes" },
  { value: "on-hold-list", label: "On hold" },
];

const listSuppressions: ActionDefinition<Input> = listOf<Input>({
  key: "list-suppressions",
  resource: "suppression",
  title: "List Suppressions",
  description:
    "List the recipients on one suppression list (GET /v1/suppressions/{type}): blocklist, hard bounces, spam complaints, unsubscribes or on hold. Each row's `id` is what Delete Suppressions takes. The default page size here is 10 (the vendor's own).",
  path: (i) => {
    if (!SUPPRESSION_LISTS.some((l) => l.value === i.type)) {
      throw new Error(`unknown suppression list "${i.type}"`);
    }
    return `/suppressions/${i.type}`;
  },
  params: [
    {
      key: "type",
      label: "List",
      type: "select",
      required: true,
      options: SUPPRESSION_LISTS,
    },
    DOMAIN_ID_FILTER,
    ...PAGE_PARAMS,
  ],
  query: (i) => ({ ...pageQuery(i), domain_id: i.domainId }),
  output: PAGE_OUTPUT,
});

export default listSuppressions;
