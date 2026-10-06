import { assertEquals, assertRejects } from "@std/assert";
import whatsappTemplateList from "../../actions/whatsapp-template-list.ts";
import { detailBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("whatsapp-template-list: GET /channels/whatsapp/templates/ with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "success": true, "templates": [{ "id": 5, "params_number": 2, "text": "Hi {{1}}" }] },
  }]);
  const out = await whatsappTemplateList.execute({ "channelId": 3 } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/channels/whatsapp/templates/");
  assertEquals(queryOf(calls[0].url), { "channel_id": "3" });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign");
  assertEquals(out, {
    "templates": [{ "id": 5, "params_number": 2, "text": "Hi {{1}}" }],
    "count": 1,
  });
});

Deno.test("whatsapp-template-list: a Landbot error surfaces its status and message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { errors: { detail: ["nope"] } } }]);
  const err = await assertRejects(
    () => Promise.resolve(whatsappTemplateList.execute({ "channelId": 3 } as never, ctx)),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("detail: nope"), true, err.message);
});

Deno.test("whatsapp-template-list: declares search", () => {
  assertEquals(whatsappTemplateList.type, "search");
  assertEquals(detailBody("x"), { detail: "x" });
});
