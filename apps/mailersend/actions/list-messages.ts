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

const listMessages: ActionDefinition<Input> = listOf<Input>({
  key: "list-messages",
  resource: "message",
  title: "List Messages",
  description:
    "List messages (one per send request) (GET /v1/messages). A message holds the emails it produced; use List Emails to see delivery state.",
  path: () => "/messages",
  params: [...PAGE_PARAMS, DOMAIN_ID_FILTER],
  query: (i) => ({ ...pageQuery(i), domain_id: i.domainId }),
  output: PAGE_OUTPUT,
});

export default listMessages;
