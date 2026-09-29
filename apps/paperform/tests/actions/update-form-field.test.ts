import { assertEquals } from "@std/assert";
import updateFormField from "../../actions/update-form-field.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("update-form-field: PUTs standard properties plus the parsed type-specific JSON merged in", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ field: { key: "3jbh8" } }) }]);
  await updateFormField.execute(
    {
      slugOrId: "f1",
      fieldKey: "3jbh8",
      title: "Favourite colour",
      required: true,
      typeOptions: JSON.stringify({ dropdown: { options: ["Red", "Blue"] } }),
    },
    ctx,
  );

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/forms/f1/fields/3jbh8");
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Favourite colour",
    required: true,
    dropdown: { options: ["Red", "Blue"] },
  });
});

Deno.test("update-form-field: accepts typeOptions already parsed (an object, not a string)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ field: {} }) }]);
  await updateFormField.execute(
    { slugOrId: "f1", fieldKey: "k1", typeOptions: { calculations: { calculation: "1 + 2" } } },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { calculations: { calculation: "1 + 2" } });
});

Deno.test("update-form-field: throws a labelled error on invalid typeOptions JSON", async () => {
  const { ctx } = mockCtx([]);
  let threw = false;
  try {
    await updateFormField.execute({ slugOrId: "f1", fieldKey: "k1", typeOptions: "{bad" }, ctx);
  } catch (err) {
    threw = true;
    assertEquals((err as Error).message.includes("Type-specific options"), true);
  }
  assertEquals(threw, true);
});

Deno.test("update-form-field: declares idempotent true", () => {
  assertEquals(updateFormField.idempotent, true);
});
