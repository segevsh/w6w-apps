import { assertEquals } from "@std/assert";
import labelList from "../../actions/label-list.ts";
import { envelope, mockCtx, pathOf, usConnection } from "../_helpers.ts";

Deno.test("label-list: fetches labels under the account", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: envelope([{ labelId: "l1", displayName: "Campaigns", color: "#ffd700" }]) }],
    usConnection({ accountId: "acc-1" }),
  );
  const out = await labelList.execute({}, ctx) as unknown as Record<string, unknown>[];

  assertEquals(pathOf(calls[0].url), "/api/accounts/acc-1/labels");
  assertEquals(out, [{ labelId: "l1", displayName: "Campaigns", color: "#ffd700" }]);
});

Deno.test("label-list: returns an empty array when the envelope carries no data", async () => {
  const { ctx } = mockCtx(
    [{ body: { status: { code: 200, description: "success" } } }],
    usConnection(),
  );
  assertEquals(await labelList.execute({}, ctx), []);
});
