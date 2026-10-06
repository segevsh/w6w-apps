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

const listRecipients: ActionDefinition<Input> = listOf<Input>({
  key: "list-recipients",
  resource: "recipient",
  title: "List Recipients",
  description:
    "List the addresses MailerSend has sent to (GET /v1/recipients). These are records of past sends, not a mailing list.",
  path: () => "/recipients",
  params: [DOMAIN_ID_FILTER, ...PAGE_PARAMS],
  query: (i) => ({ ...pageQuery(i), domain_id: i.domainId }),
  output: PAGE_OUTPUT,
});

export default listRecipients;
