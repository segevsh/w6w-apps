import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import createCustomField from "../../actions/create-custom-field.ts";

const OK = { body: { status: "success", data: { field: { id: 3, name: "plan", type: "text" } } } };

Deno.test("create-custom-field: sends `caption`, NOT `name`", async () => {
  // The request field is `caption`; the response calls the same thing `name`.
  // Sending `name` here fails Manychat's required-field check.
  const { ctx, calls } = mockCtx([OK]);
  await createCustomField.execute!({ caption: "plan", type: "text" }, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/page/createCustomField");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.caption, "plan");
  assert(!("name" in body), "the request field is `caption`");
});

Deno.test("create-custom-field: omits an unset description rather than nulling it", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await createCustomField.execute!({ caption: "plan", type: "number" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assert(!("description" in body));
  assertEquals(body.type, "number");
});

Deno.test("create-custom-field: offers exactly Manychat's five field types", () => {
  const type = createCustomField.params?.find((p) => p.key === "type");
  assertEquals(
    ((type?.options ?? []) as Array<{ value: string }>).map((o) => o.value),
    ["text", "number", "date", "datetime", "boolean"],
  );
  assertEquals(type?.default, undefined, "the type is fixed at creation — do not guess one");
});

Deno.test("create-custom-field: result nests under data.field", async () => {
  const { ctx } = mockCtx([OK]);
  const out = await createCustomField.execute!({ caption: "plan", type: "text" }, ctx) as {
    data: { field: { id: number } };
  };
  assertEquals(out.data.field.id, 3);
});
