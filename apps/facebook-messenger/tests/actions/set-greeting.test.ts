import { assertEquals, assertRejects } from "@std/assert";
import { bodyOf, mockCtx } from "../_helpers.ts";
import action from "../../actions/set-greeting.ts";

Deno.test("set-greeting: sends a default-locale greeting", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success" } }]);
  await action.execute!({ text: "Hello!" }, ctx);
  assertEquals(bodyOf(calls[0]), { greeting: [{ locale: "default", text: "Hello!" }] });
  assertEquals(calls[0].method, "POST");
});

Deno.test("set-greeting: appends localized greetings after the default", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success" } }]);
  await action.execute!({
    text: "Hello!",
    localizedGreetings: [{ locale: "en_US", text: "Timeless apparel for the masses." }],
  }, ctx);
  assertEquals((bodyOf(calls[0]).greeting as unknown[]).length, 2);
  assertEquals((bodyOf(calls[0]).greeting as { locale: string }[])[1].locale, "en_US");
});

Deno.test("set-greeting: text is required and localized must be an array", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({ text: "" }, ctx), Error, "text");
  await assertRejects(
    async () => await action.execute!({ text: "x", localizedGreetings: {} }, ctx),
    Error,
    "JSON array",
  );
  assertEquals(calls.length, 0);
});
