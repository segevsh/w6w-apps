import { assertEquals, assertRejects } from "@std/assert";
import messageHookGet from "../../actions/message-hook-get.ts";
import { detailBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("message-hook-get: GET /channels/7/message_hooks/3/ with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "success": true, "hook": { "id": 3, "url": "https://x.co/h", "token": "s3cret" } },
  }]);
  const out = await messageHookGet.execute({ "channelId": 7, "hookId": 3 } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/channels/7/message_hooks/3/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign");
  assertEquals(out, { "id": 3, "url": "https://x.co/h", "token": "[redacted]" });
});

Deno.test("message-hook-get: a Landbot error surfaces its status and message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { errors: { detail: ["nope"] } } }]);
  const err = await assertRejects(
    () => Promise.resolve(messageHookGet.execute({ "channelId": 7, "hookId": 3 } as never, ctx)),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("detail: nope"), true, err.message);
});

Deno.test("message-hook-get: declares read", () => {
  assertEquals(messageHookGet.type, "read");
  assertEquals(detailBody("x"), { detail: "x" });
});
