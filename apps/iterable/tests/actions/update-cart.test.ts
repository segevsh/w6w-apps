import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-cart.ts";

Deno.test("update-cart: metadata", () => {
  assertEquals(action.key, "update-cart");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(action.params?.map((p) => p.key), ["user", "items"]);
});

Deno.test("update-cart: calls POST /commerce/updateCart on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({ "user": { "a": 1 }, "items": [{ "x": 1 }] }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/commerce/updateCart");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { "user": { "a": 1 }, "items": [{ "x": 1 }] });
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

Deno.test("update-cart: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({ "user": { "a": 1 }, "items": [{ "x": 1 }] }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/commerce/updateCart");
});

Deno.test("update-cart: rejects a missing `user` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({ "items": [{ "x": 1 }] }, ctx);
    },
    Error,
    "`user` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-cart: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "user": { "a": 1 }, "items": [{ "x": 1 }] }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("update-cart: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "user": { "a": 1 }, "items": [{ "x": 1 }] }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
