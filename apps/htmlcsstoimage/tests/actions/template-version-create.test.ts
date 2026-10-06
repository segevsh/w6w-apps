import { assertEquals, assertRejects } from "@std/assert";
import templateVersionCreate from "../../actions/template-version-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-version-create: POSTs /template/{id} without leaking template_id into the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { template_id: "t-1", template_version: 2 } }]);
  const out = await templateVersionCreate.execute({
    template_id: "t-1",
    html: "<p>{{x}}</p>",
    name: "v2",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/template/t-1");
  assertEquals(JSON.parse(calls[0].body!), { html: "<p>{{x}}</p>", name: "v2" });
  assertEquals(out, { template_id: "t-1", template_version: 2 });
});

Deno.test("template-version-create: requires template_id and html", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await templateVersionCreate.execute({ template_id: "", html: "<p/>" }, ctx),
    Error,
    "template_id",
  );
  await assertRejects(
    async () => await templateVersionCreate.execute({ template_id: "t", html: "" }, ctx),
    Error,
    "html",
  );
  assertEquals(calls.length, 0);
});
