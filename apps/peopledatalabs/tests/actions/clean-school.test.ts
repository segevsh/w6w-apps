import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/clean-school.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("clean-school: GETs /v5/school/clean", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: 200, id: "s1", name: "harvard university" } }]);
  const out = await action.execute!({ website: "harvard.edu" } as never, ctx) as Record<
    string,
    unknown
  >;
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v5/school/clean");
  assertEquals(Object.fromEntries(url.searchParams), { website: "harvard.edu" });
  assertEquals(out.found, true);
});

Deno.test("clean-school: needs an input; 404 is found: false", async () => {
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
