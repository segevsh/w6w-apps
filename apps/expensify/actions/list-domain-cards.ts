import type { ActionDefinition } from "@w6w/types";
import { requiredText, runJob } from "../lib/client.ts";

interface Input {
  domain: string;
}

/** `get` / `domainCardList` — the Domain cards getter. */
const listDomainCards: ActionDefinition<Input> = {
  key: "list-domain-cards",
  type: "read",
  resource: "card",
  title: "List Domain Cards",
  description:
    "List the company cards assigned at domain level (masked number, owner, bank, last import).",
  params: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "example.com",
      hint: "Credentials must belong to a domain admin of this domain.",
    },
  ],
  output: [
    {
      key: "domainCardList",
      type: "array",
      label: "Cards: cardID, cardName, cardNumber (masked), email, bank…",
    },
    { key: "count", type: "number", label: "Number of cards" },
  ],

  async execute(input, ctx) {
    const res = await runJob(ctx, {
      type: "get",
      inputSettings: { type: "domainCardList", domain: requiredText("domain", input.domain) },
    });
    const domainCardList = (res.domainCardList as unknown[] | undefined) ?? [];
    return { domainCardList, count: domainCardList.length };
  },
};

export default listDomainCards;
