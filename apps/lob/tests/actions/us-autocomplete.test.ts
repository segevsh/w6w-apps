import { assertEquals, assertRejects } from "@std/assert";
import usAutocomplete from "../../actions/us-autocomplete.ts";
import { bodyOf, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("us-autocomplete: POSTs the prefix and returns suggestions", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "us_auto_1",
      suggestions: [{
        primary_line: "185 BERRY ST",
        city: "SAN FRANCISCO",
        state: "CA",
        zip_code: "94107",
      }],
    },
  }]);
  const out = await usAutocomplete.execute({ addressPrefix: "185 Ber", state: "CA" }, ctx) as {
    suggestions: unknown[];
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/us_autocompletions");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(bodyOf(calls[0]), { address_prefix: "185 Ber", state: "CA" });
  assertEquals(out.suggestions.length, 1);
});

Deno.test("us-autocomplete: valid_addresses is sent as an explicit true/false, case as proper", async () => {
  const { ctx, calls } = mockCtx([{ body: { suggestions: [] } }, { body: { suggestions: [] } }]);
  await usAutocomplete.execute({
    addressPrefix: "1",
    validOnly: false,
    properCase: true,
    geoIpSort: true,
  }, ctx);
  assertEquals(queryOf(calls[0].url), { valid_addresses: "false", case: "proper" });
  assertEquals(bodyOf(calls[0]), { address_prefix: "1", geo_ip_sort: true });
  await usAutocomplete.execute({ addressPrefix: "1", validOnly: true }, ctx);
  assertEquals(queryOf(calls[1].url), { valid_addresses: "true" });
});

Deno.test("us-autocomplete: a rate-limited call explains the limit", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: errorBody("rate_limit_exceeded", "Rate limit exceeded.", 429),
  }]);
  await assertRejects(
    async () => await usAutocomplete.execute({ addressPrefix: "1" }, ctx),
    Error,
    "300 for US verification",
  );
});
