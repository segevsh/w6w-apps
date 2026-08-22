import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/label-list.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

Deno.test("label-list: reads the bare-array collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ name: "main" }] }], conn);
  assertEquals(await action.execute!({ repo: "web" }, ctx), [{ name: "main" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/repos/acme/web/labels");
});

Deno.test("label-list: returnAll walks pages until a short one", async () => {
  const full = Array.from({ length: 50 }, (_, i) => ({ name: `n${i}` }));
  const { ctx, calls } = mockCtx([
    { status: 200, body: full },
    { status: 200, body: [{ name: "last" }] },
  ], conn);
  assertEquals(
    (await action.execute!({ repo: "web", returnAll: true }, ctx) as unknown[]).length,
    51,
  );
  assertEquals(new URL(calls[1].url).searchParams.get("page"), "2");
});

Deno.test("label-list: a blank repository fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`repo` is required");
  assertEquals(calls.length, 0);
});
