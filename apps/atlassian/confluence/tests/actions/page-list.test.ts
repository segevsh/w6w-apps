import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page-list.ts";

const display = { site: "acme" };
const page = (results: unknown[], next?: string) => ({ results, _links: next ? { next } : {} });

Deno.test("page-list: lists /pages and stops when there is no next link", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page([{ id: "1" }]) }], { display });
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/wiki/api/v2/pages");
  assertEquals(result, [{ id: "1" }]);
  assertEquals(calls.length, 1);
});

Deno.test("page-list: space ids repeat as space-id, and statuses repeat as status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page([]) }], { display });
  await action.execute!({
    spaceId: "101, 202",
    status: ["current", "archived"],
    title: "Runbook",
    sort: "-modified-date",
    bodyFormat: "storage",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("space-id"), ["101", "202"]);
  assertEquals(q.getAll("status"), ["current", "archived"]);
  assertEquals(q.get("title"), "Runbook");
  assertEquals(q.get("sort"), "-modified-date");
  assertEquals(q.get("body-format"), "storage");
});

Deno.test("page-list: returnAll follows the cursor out of _links.next", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: page([{ id: "1" }], "/wiki/api/v2/pages?cursor=c2") },
    { status: 200, body: page([{ id: "2" }]) },
  ], { display });
  assertEquals(await action.execute!({ returnAll: true }, ctx), [{ id: "1" }, { id: "2" }]);
  assertEquals(new URL(calls[1].url).searchParams.get("cursor"), "c2");
});
