import { assertEquals, assertRejects } from "@std/assert";
import contactTagCreate from "../../actions/contact-tag-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-tag-create: POSTs name and color to /contact-tags", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 5, name: "vip", color: "#FF644D" } }]);
  const out = await contactTagCreate.execute({ name: "vip", color: "#FF644D" }, ctx) as {
    id: number;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/contact-tags");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { name: "vip", color: "#FF644D" });
  assertEquals(out.id, 5);
});

Deno.test("contact-tag-create: a color is optional and omitted when unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 5, name: "vip" } }]);
  await contactTagCreate.execute({ name: "vip" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { name: "vip" });
});

Deno.test("contact-tag-create: a duplicate name surfaces the vendor's 422 message", async () => {
  const { ctx } = mockCtx([
    { status: 422, body: errorBody("The name has already been taken.", { name: ["taken"] }) },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(contactTagCreate.execute({ name: "vip" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("already been taken"), true, err.message);
  assertEquals(err.message.includes("validation: name: taken"), true, err.message);
});

Deno.test("contact-tag-create: is not marked idempotent", () => {
  assertEquals(contactTagCreate.idempotent, false);
});
