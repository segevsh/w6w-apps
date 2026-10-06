import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-list-size.ts";

Deno.test("get-list-size: metadata", () => {
  assertEquals(action.key, "get-list-size");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), ["listId"]);
});

Deno.test("get-list-size: calls GET /lists/7/size on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: "12", headers: { "content-type": "text/plain" } }]);
  const out = await action.execute({ "listId": 7 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.iterable.com/api/lists/7/size");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { size: 12, text: "12" });
});

Deno.test("get-list-size: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: "12", headers: { "content-type": "text/plain" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({ "listId": 7 }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/lists/7/size");
});

Deno.test("get-list-size: rejects a missing `listId` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "`listId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-list-size: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "listId": 7 }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("get-list-size: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "listId": 7 }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
