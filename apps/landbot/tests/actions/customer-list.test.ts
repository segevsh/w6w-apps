import { assertEquals, assertRejects } from "@std/assert";
import customerList from "../../actions/customer-list.ts";
import { detailBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-list: GET /customers/ with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "success": true, "total": 2, "customers": [{ "id": 1 }, { "id": 2 }] },
  }]);
  const out = await customerList.execute(
    {
      "channelId": 1,
      "agentId": 2,
      "searchBy": "email",
      "search": "a@b.co",
      "archived": false,
      "optIn": true,
      "offset": 0,
      "limit": 20,
    } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/customers/");
  assertEquals(queryOf(calls[0].url), {
    "channel_id": "1",
    "agent_id": "2",
    "search_by": "email",
    "search": "a@b.co",
    "archived": "false",
    "opt_in": "true",
    "offset": "0",
    "limit": "20",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign");
  assertEquals(out, {
    "customers": [{ "id": 1 }, { "id": 2 }],
    "count": 2,
    "total": 2,
    "nextOffset": null,
  });
});

Deno.test("customer-list: a Landbot error surfaces its status and message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { errors: { detail: ["nope"] } } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        customerList.execute(
          {
            "channelId": 1,
            "agentId": 2,
            "searchBy": "email",
            "search": "a@b.co",
            "archived": false,
            "optIn": true,
            "offset": 0,
            "limit": 20,
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("detail: nope"), true, err.message);
});

Deno.test("customer-list: declares search", () => {
  assertEquals(customerList.type, "search");
  assertEquals(detailBody("x"), { detail: "x" });
});
