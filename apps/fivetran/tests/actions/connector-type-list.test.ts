import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { page } from "./_shared.ts";
import action from "../../actions/connector-type-list.ts";

Deno.test("connector-type-list: returns the sources and their service ids", async () => {
  const { ctx, calls } = mockCtx([page([
    { id: "shopify", name: "Shopify", service: "shopify" },
    { id: "stripe", name: "Stripe", service: "stripe" },
  ])]);
  const result = await action.execute!({}, ctx) as { count: number; services: string[] };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://api.fivetran.com/v1/metadata/connector-types",
  );
  assertEquals(result.count, 2);
  assertEquals(result.services, ["shopify", "stripe"]);
});

/** Fivetran has no server-side search here, so it is applied to the page. */
Deno.test("connector-type-list: the search filters case-insensitively", async () => {
  const { ctx } = mockCtx([page([
    { id: "shopify", name: "Shopify", service: "shopify" },
    { id: "stripe", name: "Stripe", service: "stripe" },
  ])]);
  const result = await action.execute!({ search: "SHOP" }, ctx) as { services: string[] };
  assertEquals(result.services, ["shopify"]);
});

Deno.test("connector-type-list: says it is metadata rather than account data", () => {
  assert(/same for everybody/.test(action.description!), action.description);
});
