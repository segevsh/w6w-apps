import { assertEquals } from "@std/assert";
import listFormFields from "../../actions/list-form-fields.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-form-fields: GETs /v1/forms/{slugOrId}/fields with a search query", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ fields: [{ key: "3jbh8" }] }),
  }]);
  const out = await listFormFields.execute({ slugOrId: "f1", search: "Name" }, ctx) as {
    fields: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/v1/forms/f1/fields");
  assertEquals(queryOf(calls[0].url), { search: "Name" });
  assertEquals(out.fields.length, 1);
});

Deno.test("list-form-fields: an empty result set returns an empty array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: envelope({}) }]);
  const out = await listFormFields.execute({ slugOrId: "f1" }, ctx) as { fields: unknown[] };
  assertEquals(out.fields, []);
});
