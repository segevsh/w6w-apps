import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import listSelectOptions from "../../actions/list-select-options.ts";
import listStatuses from "../../actions/list-statuses.ts";

Deno.test("list-select-options: builds the …/attributes/{attribute}/options path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await listSelectOptions.execute({
    target: "objects",
    identifier: "companies",
    attribute: "categories",
    showArchived: true,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/objects/companies/attributes/categories/options");
  assertEquals(url.searchParams.get("show_archived"), "true");
});

/**
 * Both endpoints share the same contract, and it is the reason to call them:
 * an unknown title is an error, not an auto-created option.
 */
Deno.test("select options and statuses both warn that an unknown title is rejected, not created", () => {
  for (const action of [listSelectOptions, listStatuses]) {
    const d = action.description!;
    assert(/rejected, not created/i.test(d), `${action.key}: ${d}`);
  }
});
