import { assertEquals } from "@std/assert";
import { mockMocoCtx } from "../_helpers.ts";
import action from "../../actions/company-create.ts";

Deno.test("company-create: POSTs /companies with the mapped body", async () => {
  const { ctx, calls } = mockMocoCtx([{ body: { id: 1, type: "customer", name: "Beispiel AG" } }]);
  const out = await action.execute({
    type: "customer",
    name: "Beispiel AG",
    identifier: "C-1001",
    countryCode: "CH",
    currency: "CHF",
    tags: ["A-Kunde", "Enterprise"],
  }, ctx);
  assertEquals(calls[0].url, "https://acme.mocoapp.com/api/v1/companies");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "customer");
  assertEquals(body.name, "Beispiel AG");
  assertEquals(body.country_code, "CH");
  assertEquals(body.tags, ["A-Kunde", "Enterprise"]);
  assertEquals(out, { id: 1, type: "customer", name: "Beispiel AG" });
});
