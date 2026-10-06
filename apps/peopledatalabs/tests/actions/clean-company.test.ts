import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/clean-company.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("clean-company: GETs /v5/company/clean", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: 200, id: "c1", name: "people data labs", score: 4 },
  }]);
  const out = await action.execute!({ name: "People data Labs" } as never, ctx) as Record<
    string,
    unknown
  >;
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v5/company/clean");
  assertEquals(Object.fromEntries(url.searchParams), { name: "People data Labs" });
  assertEquals(out.found, true);
  assertEquals(out.id, "c1");
});

Deno.test("clean-company: needs an input; 404 is found: false", async () => {
  await assertRejects(
    async () => await action.execute!({} as never, mockCtx([]).ctx),
    Error,
    "Give a name",
  );
  const { ctx } = mockCtx([{ status: 404, body: { status: 404, error: { type: ["not_found"] } } }]);
  assertEquals(
    ((await action.execute!({ name: "zz" } as never, ctx)) as Record<string, unknown>).found,
    false,
  );
});
