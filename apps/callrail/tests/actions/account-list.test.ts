import { assertEquals } from "@std/assert";
import accountList from "../../actions/account-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("account-list: hits /v3/a.json and reshapes pagination to camelCase", async () => {
  const { ctx, calls } = mockCtx([
    { body: listEnvelope("accounts", [{ id: "ACC1", name: "Acme" }]) },
  ]);
  const out = await accountList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/a.json");
  assertEquals(out, {
    accounts: [{ id: "ACC1", name: "Acme" }],
    page: 1,
    perPage: 100,
    totalPages: 1,
    totalRecords: 1,
  });
});

Deno.test("account-list: forwards filter, sort and pagination params using the vendor's names", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("accounts", []) }]);
  await accountList.execute(
    { hipaaAccount: true, sort: "name", order: "desc", page: 2, perPage: 25 },
    ctx,
  );
  const q = queryOf(calls[0].url);
  assertEquals(q.hipaa_account, "true");
  assertEquals(q.sort, "name");
  assertEquals(q.order, "desc");
  assertEquals(q.page, "2");
  assertEquals(q.per_page, "25");
});

Deno.test("account-list: takes no accountId — it is the discovery action", () => {
  const keys = accountList.params?.map((p) => p.key) ?? [];
  assertEquals(keys.includes("accountId"), false);
});
