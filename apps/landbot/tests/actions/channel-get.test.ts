import { assertEquals, assertRejects } from "@std/assert";
import channelGet from "../../actions/channel-get.ts";
import { detailBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("channel-get: GET /channels/7/ with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "success": true, "channel": { "id": 7, "name": "Web", "token": "tok" } },
  }]);
  const out = await channelGet.execute({ "channelId": 7 } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/channels/7/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign");
  assertEquals(out, { "id": 7, "name": "Web", "token": "[redacted]" });
});

Deno.test("channel-get: a Landbot error surfaces its status and message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { errors: { detail: ["nope"] } } }]);
  const err = await assertRejects(
    () => Promise.resolve(channelGet.execute({ "channelId": 7 } as never, ctx)),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("detail: nope"), true, err.message);
});

Deno.test("channel-get: declares read", () => {
  assertEquals(channelGet.type, "read");
  assertEquals(detailBody("x"), { detail: "x" });
});
