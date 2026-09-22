import { assertEquals, assertRejects } from "@std/assert";
import { mockBiginCtx } from "../_helpers.ts";
import action from "../../actions/search-records.ts";

Deno.test("search-records: GETs /{module}/search with the documented criteria grammar", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: { data: [{ id: "1" }], info: { count: 1 } } }]);
  await action.execute(
    { module: "Pipelines", criteria: "((Deal_Name:starts_with:W)and(Amount:greater_than:5000))" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/bigin/v2/Pipelines/search");
  assertEquals(
    url.searchParams.get("criteria"),
    "((Deal_Name:starts_with:W)and(Amount:greater_than:5000))",
  );
});

Deno.test("search-records: accepts the account module's real API name", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: { data: [] } }]);
  await action.execute({ module: "Accounts", email: "a@acme.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/bigin/v2/Accounts/search");
  assertEquals(url.searchParams.get("email"), "a@acme.com");
});

Deno.test("search-records: sends exactly one selector, never two at once", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: { data: [] } }]);
  await action.execute({ module: "Contacts", word: "abc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals([...url.searchParams.keys()], ["word"]);
  assertEquals(url.searchParams.get("word"), "abc");
});

Deno.test("search-records: rejects a call with no selector or with several", async () => {
  const { ctx } = mockBiginCtx([{ body: { data: [] } }]);
  await assertRejects(
    // `moduleName`/selector validation throws SYNCHRONOUSLY, before any promise
    // exists — `async` is required here (not just style) so that throw is
    // caught inside this function's own promise and reaches `assertRejects` as
    // a rejection rather than an uncaught synchronous throw.
    async () => {
      await action.execute({ module: "Contacts" }, ctx);
    },
    Error,
    "exactly one",
  );
  await assertRejects(
    async () => {
      await action.execute({ module: "Contacts", email: "a@acme.com", word: "abc" }, ctx);
    },
    Error,
    "exactly one",
  );
});

Deno.test("search-records: rejects a module name that is not an API identifier", async () => {
  const { ctx } = mockBiginCtx([{ body: { data: [] } }]);
  await assertRejects(
    async () => {
      await action.execute({ module: "Contacts/search?word=x", word: "x" }, ctx);
    },
    Error,
    "not a valid Bigin module API name",
  );
});
