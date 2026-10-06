import { assertEquals, assertRejects } from "@std/assert";
import channelList from "../../actions/channel-list.ts";
import { detailBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("channel-list: GET /channels/ with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "success": true,
      "total": 45,
      "channels": [{ "id": 1, "name": "WA", "token": "secret-ch-token" }],
    },
  }]);
  const out = await channelList.execute(
    { "type": "whatsapi", "active": true, "offset": 20, "limit": 10 } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/channels/");
  assertEquals(queryOf(calls[0].url), {
    "type": "whatsapi",
    "active": "true",
    "offset": "20",
    "limit": "10",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign");
  assertEquals(out, {
    "channels": [{ "id": 1, "name": "WA", "token": "[redacted]" }],
    "count": 1,
    "total": 45,
    "nextOffset": 21,
  });
});

Deno.test("channel-list: a Landbot error surfaces its status and message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { errors: { detail: ["nope"] } } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        channelList.execute(
          { "type": "whatsapi", "active": true, "offset": 20, "limit": 10 } as never,
          ctx,
        ),
      ),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("detail: nope"), true, err.message);
});

Deno.test("channel-list: declares search", () => {
  assertEquals(channelList.type, "search");
  assertEquals(detailBody("x"), { detail: "x" });
});
