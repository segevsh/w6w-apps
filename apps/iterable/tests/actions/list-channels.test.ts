import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-channels.ts";

Deno.test("list-channels: metadata", () => {
  assertEquals(action.key, "list-channels");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), []);
});

Deno.test("list-channels: calls GET /channels on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "channels": [{ "id": 1, "name": "Email" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.iterable.com/api/channels");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "channels": [{ "id": 1, "name": "Email" }] });
});

Deno.test("list-channels: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "channels": [{ "id": 1, "name": "Email" }] } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/channels");
});

Deno.test("list-channels: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("list-channels: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
