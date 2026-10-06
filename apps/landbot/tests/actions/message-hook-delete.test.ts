import { assertEquals, assertRejects } from "@std/assert";
import messageHookDelete from "../../actions/message-hook-delete.ts";
import { detailBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("message-hook-delete: DELETE /channels/7/message_hooks/3/ with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await messageHookDelete.execute({ "channelId": 7, "hookId": 3 } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/channels/7/message_hooks/3/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign");
  assertEquals(out, { "ok": true });
});

Deno.test("message-hook-delete: a Landbot error surfaces its status and message", async () => {
  const { ctx } = mockCtx([{ status: 412, body: { errors: { detail: ["nope"] } } }]);
  const err = await assertRejects(
    () => Promise.resolve(messageHookDelete.execute({ "channelId": 7, "hookId": 3 } as never, ctx)),
    Error,
  );
  assertEquals(err.message.includes("412"), true, err.message);
  assertEquals(err.message.includes("detail: nope"), true, err.message);
});

Deno.test("message-hook-delete: declares perform", () => {
  assertEquals(messageHookDelete.type, "perform");
  assertEquals(detailBody("x"), { detail: "x" });
});
