import { assert, assertEquals } from "@std/assert";
import { data, gqlOf, mockCtx } from "../_helpers.ts";
import accountGet from "../../actions/account-get.ts";

Deno.test("account-get: email is NOT selected by default", async () => {
  const { ctx, calls } = mockCtx([data({ account: { id: "a1" } })]);
  await accountGet.execute({}, ctx);
  const { query } = gqlOf(calls[0]);
  assert(!/\bemail\b/.test(query), query);
  assert(!/backupEmail/.test(query), query);
});

Deno.test("account-get: opting in adds both email fields and nothing else", async () => {
  const { ctx, calls } = mockCtx([data({ account: { id: "a1" } })]);
  await accountGet.execute({ includeEmail: true }, ctx);
  const { query } = gqlOf(calls[0]);
  assert(/\bemail\b/.test(query), query);
  assert(/backupEmail/.test(query), query);
});

Deno.test("account-get: connectedApps is never selected, at either setting", async () => {
  for (const includeEmail of [false, true]) {
    const { ctx, calls } = mockCtx([data({ account: { id: "a1" } })]);
    await accountGet.execute({ includeEmail }, ctx);
    assert(!/connectedApps/.test(gqlOf(calls[0]).query), `includeEmail=${includeEmail}`);
  }
});

Deno.test("account-get: the email toggle is advanced and off by default", () => {
  const p = (accountGet.params ?? []).find((p) => p.key === "includeEmail")!;
  assertEquals(p.type, "boolean");
  assertEquals(p.advanced, true);
  assertEquals(p.default, undefined);
});

Deno.test("account-get: selects the timezone — the field that explains an off-by-an-hour dueAt", async () => {
  const { ctx, calls } = mockCtx([data({ account: { id: "a1" } })]);
  await accountGet.execute({}, ctx);
  assert(/timezone/.test(gqlOf(calls[0]).query));
});
