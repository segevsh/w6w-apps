import { assert, assertEquals } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/create-field.ts";

const body = (raw: string | null) => JSON.parse(raw!);

Deno.test("create-field: POSTs label and fieldType with tableId in the query", async () => {
  const { ctx, calls } = mockQbCtx([{ body: { id: 14 } }]);
  const out = await action.execute({ tableId: "bck1", label: "Email", fieldType: "email" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/fields");
  assertEquals(new URL(calls[0].url).searchParams.get("tableId"), "bck1");
  assertEquals(body(calls[0].body), { label: "Email", fieldType: "email" });
  assertEquals(out.id, 14);
});

Deno.test("create-field: forwards type-specific properties as JSON", async () => {
  const { ctx, calls } = mockQbCtx([{ body: {} }]);
  await action.execute({
    tableId: "bck1",
    label: "Total",
    fieldType: "currency",
    properties: '{"decimalPlaces":2}',
    required: true,
  }, ctx);

  assertEquals(body(calls[0].body).properties, { decimalPlaces: 2 });
  assertEquals(body(calls[0].body).required, true);
});

Deno.test("create-field: offers exactly the field types the published spec enumerates", () => {
  const options = action.params!.find((p) => p.key === "fieldType")!.options as
    | Array<{ value: string }>
    | undefined;
  const values = options!.map((o) => o.value);

  // Verified against the `fieldType` enum in developer.quickbase.com/quickbase.json.
  assertEquals(values, [
    "text",
    "text-multiple-choice",
    "text-multi-line",
    "rich-text",
    "numeric",
    "currency",
    "rating",
    "percent",
    "multitext",
    "email",
    "url",
    "duration",
    "date",
    "datetime",
    "timestamp",
    "timeofday",
    "checkbox",
    "user",
    "multiuser",
    "address",
    "phone",
    "file",
  ]);
  assert(!values.includes("formula"), "formula is a field MODE, not a fieldType");
});
