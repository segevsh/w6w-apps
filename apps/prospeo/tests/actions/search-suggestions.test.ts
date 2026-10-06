import { assertEquals, assertRejects } from "@std/assert";
import action, { SUGGESTION_FIELDS } from "../../actions/search-suggestions.ts";
import { bodyOf, exec, mockCtx } from "../_helpers.ts";

Deno.test("search-suggestions: sends the single field and reads <field>_suggestions", async () => {
  const { ctx, calls } = mockCtx([{
    body: { error: false, location_suggestions: [{ name: "France", type: "COUNTRY" }] },
  }]);
  const out = await exec(action, { field: "location_search", query: " fra " }, ctx);
  assertEquals(calls[0].url, "https://api.prospeo.io/search-suggestions");
  assertEquals(bodyOf(calls[0]), { location_search: "fra" });
  assertEquals(out.suggestions, [{ name: "France", type: "COUNTRY" }]);
});

Deno.test("search-suggestions: company-field responses map the same way", async () => {
  const { ctx } = mockCtx([{
    body: { error: false, company_integrations_suggestions: ["Salesforce"] },
  }]);
  const out = await exec(action, { field: "company_integrations_search", query: "sales" }, ctx);
  assertEquals(out.suggestions, ["Salesforce"]);
});

Deno.test("search-suggestions: short query and unknown field are refused; all fields are selectable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => exec(action, { field: "sic_search", query: "a" }, ctx), Error, "2");
  await assertRejects(() => exec(action, { field: "nope", query: "abc" }, ctx), Error, "unknown");
  assertEquals(calls.length, 0);
  const select = action.params!.find((p) => p.key === "field")!;
  assertEquals((select.options as unknown[]).length, SUGGESTION_FIELDS.length);
});
