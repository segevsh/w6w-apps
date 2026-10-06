import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/link-create.ts";
import { LINK, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("link-create: POSTs /links with the supplied fields and omits empty ones", async () => {
  const { ctx, calls } = mockCtx([{ body: LINK }]);
  await action.execute({
    originalURL: "https://example.com/long",
    domain: "go.example.com",
    path: "spring",
    tags: ["a"],
    title: "",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/links");
  assertEquals(JSON.parse(calls[0].body!), {
    originalURL: "https://example.com/long",
    domain: "go.example.com",
    path: "spring",
    tags: ["a"],
  });
});

Deno.test("link-create: never returns the echoed password, sends no credential", async () => {
  const { ctx, calls } = mockCtx([{ body: LINK }]);
  const out = await action.execute({ originalURL: "https://x.test", domain: "d.test" }, ctx);
  assertEquals(out.idString, "lnk_abc_def");
  assert(!("password" in out));
  assert(!("authorization" in calls[0].headers));
});

Deno.test("link-create: surfaces the vendor's error message on 409", async () => {
  const { ctx } = mockCtx([{ status: 409, body: { message: "Link already exists" } }]);
  await assertRejects(
    async () => await action.execute({ originalURL: "https://x.test", domain: "d.test" }, ctx),
    Error,
    "409",
  );
});

Deno.test("link-create: is not idempotent", () => assertEquals(action.idempotent, false));
