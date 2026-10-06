import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-create.ts";

Deno.test("account-create: POST /3/accounts with a wrapped body", async () => {
  const reply = { "Account": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ status: 201, body: reply }]);
  const result = await action.execute!({
    "number": 7,
    "description": "description-v",
    "active": true,
    "sru": 7,
    "costCenterSettings": "ALLOWED",
    "projectSettings": "ALLOWED",
    "vatCode": "vatCode-v",
    "additionalFields": { "Comments": "extra" },
    "financialYear": "financialYear-v",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/3/accounts");
  assertEquals(Object.fromEntries(url.searchParams), { "financialyear": "financialYear-v" });
  assertEquals(JSON.parse(calls[0].body!), {
    Account: {
      "Number": 7,
      "Description": "description-v",
      "Active": true,
      "SRU": 7,
      "CostCenterSettings": "ALLOWED",
      "ProjectSettings": "ALLOWED",
      "VATCode": "vatCode-v",
      "Comments": "extra",
    },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, reply);

  // Optional params that were not set are left out of the payload entirely.
  const bare = mockCtx([{ body: reply }]);
  await action.execute!({ "number": 7 } as never, bare.ctx);
  assertEquals(JSON.parse(bare.calls[0].body!), { Account: { "Number": 7 } });
  assertEquals(Object.fromEntries(new URL(bare.calls[0].url).searchParams), {});
});

Deno.test("account-create: rejects an additionalFields that is not a JSON object", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ "number": 7, "additionalFields": "[1]" } as never, ctx),
    Error,
    "additionalFields must be a JSON object",
  );
  assertEquals(calls.length, 0);
});
