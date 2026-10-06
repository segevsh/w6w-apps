import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-user-fields.ts";

Deno.test("get-user-fields: metadata", () => {
  assertEquals(action.key, "get-user-fields");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), []);
});

Deno.test("get-user-fields: calls GET /users/getFields on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "fields": { "firstName": "string" } } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.iterable.com/api/users/getFields");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "fields": { "firstName": "string" } });
});

Deno.test("get-user-fields: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "fields": { "firstName": "string" } } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/users/getFields");
});

Deno.test("get-user-fields: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("get-user-fields: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
