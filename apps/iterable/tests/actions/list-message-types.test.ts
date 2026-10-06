import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-message-types.ts";

Deno.test("list-message-types: metadata", () => {
  assertEquals(action.key, "list-message-types");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), []);
});

Deno.test("list-message-types: calls GET /messageTypes on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "messageTypes": [{ "id": 1 }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.iterable.com/api/messageTypes");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "messageTypes": [{ "id": 1 }] });
});

Deno.test("list-message-types: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "messageTypes": [{ "id": 1 }] } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/messageTypes");
});

Deno.test("list-message-types: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("list-message-types: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
