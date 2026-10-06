import { assertEquals } from "@std/assert";
import chatCreate from "../../actions/chat-create.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("chat-create: uses the supplied chat id", async () => {
  const id = "0b6c6f0e-5f0e-4c1b-8d57-2a7a3a1c9a11";
  const { ctx, calls } = mockCtx([{ body: ok({ chat_id: id, chat_status: "ongoing" }) }]);
  const out = await chatCreate.execute({ chat_id: id, model_id: "m1", metadata: { a: 1 } }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `/v2/chat/${id}`);
  assertEquals(JSON.parse(calls[0].body!), { model_id: "m1", metadata: { a: 1 } });
  assertEquals((out as { chat_status: string }).chat_status, "ongoing");
});

Deno.test("chat-create: generates a UUID when none is supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ chat_id: "x" }) }]);
  await chatCreate.execute({ model_id: "m1" }, ctx);
  const seg = pathOf(calls[0].url).split("/").pop()!;
  assertEquals(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(seg),
    true,
  );
});
