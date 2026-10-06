import { assertEquals } from "@std/assert";
import accountUpdate from "../../actions/account-update.ts";
import { bodyOf, mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("account-update: PATCHes /accounts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: single("account", 4, { industry: "SaaS" }) }]);
  await accountUpdate.execute({ id: 4, industry: "SaaS" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/accounts/4");
  assertEquals(bodyOf(calls[0]), {
    data: { type: "account", id: 4, attributes: { industry: "SaaS" } },
  });
});

Deno.test("account-update: only the id is required", () => {
  assertEquals(accountUpdate.params!.filter((p) => p.required).map((p) => p.key), ["id"]);
});
