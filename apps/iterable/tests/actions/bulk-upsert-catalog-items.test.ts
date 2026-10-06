import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bulk-upsert-catalog-items.ts";

Deno.test("bulk-upsert-catalog-items: metadata", () => {
  assertEquals(action.key, "bulk-upsert-catalog-items");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(action.params?.map((p) => p.key), [
    "catalogName",
    "documents",
    "replaceUploadedFieldsOnly",
  ]);
});

Deno.test("bulk-upsert-catalog-items: calls POST /catalogs/my-cat/items on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({
    "catalogName": "my-cat",
    "documents": { "i1": { "a": 1 } },
    "replaceUploadedFieldsOnly": true,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/catalogs/my-cat/items");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "documents": { "i1": { "a": 1 } },
    "replaceUploadedFieldsOnly": true,
  });
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

Deno.test("bulk-upsert-catalog-items: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({
    "catalogName": "my-cat",
    "documents": { "i1": { "a": 1 } },
    "replaceUploadedFieldsOnly": true,
  }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/catalogs/my-cat/items");
});

Deno.test("bulk-upsert-catalog-items: rejects a missing `catalogName` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute(
        { "documents": { "i1": { "a": 1 } }, "replaceUploadedFieldsOnly": true },
        ctx,
      );
    },
    Error,
    "`catalogName` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("bulk-upsert-catalog-items: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "catalogName": "my-cat",
        "documents": { "i1": { "a": 1 } },
        "replaceUploadedFieldsOnly": true,
      }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("bulk-upsert-catalog-items: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "catalogName": "my-cat",
        "documents": { "i1": { "a": 1 } },
        "replaceUploadedFieldsOnly": true,
      }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
