import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-catalog.ts";

Deno.test("delete-catalog: metadata", () => {
  assertEquals(action.key, "delete-catalog");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(action.params?.map((p) => p.key), ["catalogName"]);
});

Deno.test("delete-catalog: calls DELETE /catalogs/my-cat on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({ "catalogName": "my-cat" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.iterable.com/api/catalogs/my-cat");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

Deno.test("delete-catalog: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({ "catalogName": "my-cat" }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/catalogs/my-cat");
});

Deno.test("delete-catalog: rejects a missing `catalogName` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "`catalogName` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("delete-catalog: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "catalogName": "my-cat" }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("delete-catalog: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "catalogName": "my-cat" }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
