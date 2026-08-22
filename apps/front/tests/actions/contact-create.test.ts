import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: an email becomes an email handle", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "cnt_1" } }]);
  await action.execute!({ name: "Ada", email: "ada@example.com" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.handles, [{ handle: "ada@example.com", source: "email" }]);
  assertEquals(sent.name, "Ada");
});

Deno.test("contact-create: extra handles merge with the email field", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "cnt_1" } }]);
  await action.execute!({
    email: "ada@example.com",
    handles: '[{"handle":"+15551234","source":"phone"}]',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).handles, [
    { handle: "ada@example.com", source: "email" },
    { handle: "+15551234", source: "phone" },
  ]);
});

/** A contact with no handle cannot be matched to the next message. */
Deno.test("contact-create: no handle at all is refused with the reason", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({ name: "Ada" }, ctx), Error, "handle");
  assertEquals(calls.length, 0);
});

Deno.test("contact-create: the list-names param warns that Front creates missing lists", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "listNames")!;
  assert(/CREATES/.test(p.hint!), p.hint);
});
