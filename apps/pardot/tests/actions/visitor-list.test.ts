import { assertEquals, assertRejects } from "@std/assert";
import { mockPardotCtx } from "../_helpers.ts";
import action from "../../actions/visitor-list.ts";

Deno.test("visitor-list: GETs /visitors with the default field list when none is given", async () => {
  const { ctx, calls } = mockPardotCtx([{ body: { values: [{ id: 1 }] } }]);
  const out = await action.execute({}, ctx) as { values: unknown[] };
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://pi.pardot.com");
  assertEquals(url.pathname, "/api/v5/objects/visitors");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.get("fields")!.split(",")[0], "id");
  assertEquals(url.searchParams.get("limit"), null);
  assertEquals(out.values, [{ id: 1 }]);
});

Deno.test("visitor-list: sends a filter, fields and limit as query parameters", async () => {
  const { ctx, calls } = mockPardotCtx([{ body: { values: [] } }]);
  await action.execute({ fields: "id,name", limit: 50, prospectId: 77 }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("fields"), "id,name");
  assertEquals(q.get("limit"), "50");
  assertEquals(q.get("prospectId"), "77");
});

Deno.test("visitor-list: with a page token sends ONLY fields and the token", async () => {
  const { ctx, calls } = mockPardotCtx([
    {
      body: { nextPageToken: "tok2", nextPageUrl: "https://pi.pardot.com/x", values: [{ id: 9 }] },
    },
  ]);
  const out = await action.execute(
    { fields: "id", nextPageToken: "tok1", limit: 10, prospectId: 77, orderBy: "id DESC" },
    ctx,
  ) as { nextPageToken: string };
  const q = new URL(calls[0].url).searchParams;
  assertEquals([...q.keys()].sort(), ["fields", "nextPageToken"]);
  assertEquals(q.get("nextPageToken"), "tok1");
  assertEquals(out.nextPageToken, "tok2");
});

Deno.test("visitor-list: an exhausted query reports a null token", async () => {
  const { ctx } = mockPardotCtx([{ body: { values: [] } }]);
  const out = await action.execute({}, ctx) as { nextPageToken: unknown; nextPageUrl: unknown };
  assertEquals(out.nextPageToken, null);
  assertEquals(out.nextPageUrl, null);
});

Deno.test("visitor-list: rejects an orderBy field the docs do not list", async () => {
  const { ctx, calls } = mockPardotCtx([]);
  await assertRejects(
    async () => await action.execute({ orderBy: "password DESC" }, ctx),
    Error,
    "orderBy",
  );
  assertEquals(calls.length, 0);
});

Deno.test("visitor-list: surfaces the v5 error envelope", async () => {
  const { ctx } = mockPardotCtx([
    {
      status: 403,
      body: {
        code: 201,
        message: "Business Unit specified in Pardot-Business-Unit-Id header not found or inactive.",
      },
    },
  ]);
  await assertRejects(
    async () => await action.execute({}, ctx),
    Error,
    "[201] Business Unit specified",
  );
});

Deno.test("visitor-list: forwards the recycle-bin selector", async () => {
  const { ctx, calls } = mockPardotCtx([{ body: { values: [] } }]);
  await action.execute({ deleted: "all" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("deleted"), "all");
});
