import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import listAttributes from "../../actions/list-attributes.ts";

Deno.test("list-attributes: builds /v2/{target}/{identifier}/attributes", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await listAttributes.execute({
    target: "objects",
    identifier: "people",
    showArchived: true,
    limit: 50,
    offset: 10,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/objects/people/attributes");
  assertEquals(url.searchParams.get("show_archived"), "true");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(url.searchParams.get("offset"), "10");
});

Deno.test("list-attributes: works against a list as well as an object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await listAttributes.execute({ target: "lists", identifier: "sales" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/lists/sales/attributes");
});

/** The path parameter's enum is exactly two values; offering a third would 404. */
Deno.test("list-attributes: the target enum is exactly objects and lists", () => {
  assertEquals(optionValues(listAttributes, "target"), ["objects", "lists"]);
  assertEquals(param(listAttributes, "target").default, "objects");
});

/**
 * The two flags that decide how every write in this app must be shaped. If the
 * description stops naming them, the action stops explaining why to run it.
 */
Deno.test("list-attributes: names is_multiselect and is_unique as the reason to call it", () => {
  const d = listAttributes.description!;
  assert(d.includes("is_multiselect"), d);
  assert(d.includes("is_unique"), d);
});
