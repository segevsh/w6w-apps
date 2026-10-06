import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-list-users.ts";

Deno.test("get-list-users: metadata", () => {
  assertEquals(action.key, "get-list-users");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), ["listId", "preferUserId"]);
});

Deno.test("get-list-users: calls GET /lists/getUsers on the US host", async () => {
  const { ctx, calls } = mockCtx([{
    body: "a@b.co\nc@d.co\n",
    headers: { "content-type": "text/plain" },
  }]);
  const out = await action.execute({ "listId": 7, "preferUserId": true }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.iterable.com/api/lists/getUsers?listId=7&preferUserId=true",
  );
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { users: ["a@b.co", "c@d.co"], text: "a@b.co\nc@d.co\n" });
});

Deno.test("get-list-users: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{
    body: "a@b.co\nc@d.co\n",
    headers: { "content-type": "text/plain" },
  }], { connection: { display: { region: "eu" } } });
  await action.execute({ "listId": 7, "preferUserId": true }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.eu.iterable.com/api/lists/getUsers?listId=7&preferUserId=true",
  );
});

Deno.test("get-list-users: rejects a missing `listId` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({ "preferUserId": true }, ctx);
    },
    Error,
    "`listId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-list-users: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "listId": 7, "preferUserId": true }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("get-list-users: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "listId": 7, "preferUserId": true }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
