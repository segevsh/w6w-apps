import { assert, assertEquals, assertRejects } from "@std/assert";
import list from "../../actions/segment-people-list.ts";
import { errBody, mockCtx, pathOf } from "../_helpers.ts";

const run = (ctx: Parameters<typeof list.execute>[1], input: Record<string, unknown>) =>
  list.execute(input as never, ctx) as Promise<unknown>;

Deno.test("segment-people-list: declares a read action", () => {
  assertEquals(list.key, "segment-people-list");
  assertEquals(list.type, "read");
  assert((list.description ?? "").length > 0);
  assert(Array.isArray(list.output) && list.output.length > 0);
});

Deno.test("segment-people-list: path carries the id; paging, sort and repeated attributes in the query", async () => {
  const body = { people: [{ email: "a@x.com" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await run(ctx, {
      segmentId: 12,
      limit: 50,
      offset: 100,
      attributes: "email, firstName",
      sort: "email",
      order: "desc",
    }),
    body,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/segments/12/people");
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("limit"), "50");
  assertEquals(q.get("offset"), "100");
  assertEquals(q.get("sort"), "email");
  assertEquals(q.get("order"), "desc");
  assertEquals(q.getAll("attributes"), ["email", "firstName"]);
});

Deno.test("segment-people-list: omits unset options and requires an id", async () => {
  const { ctx, calls } = mockCtx([{ body: { people: [] } }]);
  await run(ctx, { segmentId: "7" });
  assertEquals(calls[0].url, "https://api.encharge.io/v1/segments/7/people");
  await assertRejects(() => run(ctx, {}), Error, "segmentId");
});

Deno.test("segment-people-list: an Encharge failure is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errBody("Segment not found") }]);
  await assertRejects(() => run(ctx, { segmentId: 1 }), Error, "Segment not found");
});
