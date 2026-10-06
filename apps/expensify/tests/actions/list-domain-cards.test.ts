import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-domain-cards.ts";
import { mockCtx } from "../_helpers.ts";
import { assertWire, sent } from "../_job.ts";

const CARDS = [{
  cardID: 5312342,
  cardName: "John Doe - 1979",
  cardNumber: "1234XXXXXXXX1979",
  bank: "citibank.com",
}];

Deno.test("list-domain-cards: posts get/domainCardList and returns cards with a count", async () => {
  const { ctx, calls } = mockCtx([{ body: { responseCode: 200, domainCardList: CARDS } }]);
  const out = await action.execute!({ domain: "domain.tld" }, ctx);
  assertWire(calls[0]);
  assertEquals(sent(calls[0]).job, {
    type: "get",
    inputSettings: { type: "domainCardList", domain: "domain.tld" },
  });
  assertEquals(out, { domainCardList: CARDS, count: 1 });
});

Deno.test("list-domain-cards: requires a domain locally and surfaces vendor errors", async () => {
  await assertRejects(
    async () => await action.execute!({ domain: " " }, mockCtx([]).ctx),
    Error,
    "domain is required",
  );
  const { ctx } = mockCtx([{
    body: { responseMessage: "Domain name is missing or malformed", responseCode: 410 },
  }]);
  await assertRejects(async () => await action.execute!({ domain: "x" }, ctx), Error, "malformed");
});

Deno.test("list-domain-cards: declares a read", () => {
  assertEquals(action.type, "read");
});
