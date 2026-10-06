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
}

const listTemplates: ActionDefinition<Input> = listOf<Input>({
  key: "list-templates",
  resource: "template",
  title: "List Templates",
  description:
    "List email templates (GET /v1/templates). Use a template's `id` as `templateId` in Send Email.",
  path: () => "/templates",
  params: [DOMAIN_ID_FILTER, ...PAGE_PARAMS],
  query: (i) => ({ ...pageQuery(i), domain_id: i.domainId }),
  output: PAGE_OUTPUT,
});

export default listTemplates;
