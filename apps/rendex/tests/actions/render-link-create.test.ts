import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/render-link-create.ts";
import { bodyOf, envelope, mockCtx, obj, pathOf } from "../_helpers.ts";

Deno.test("render-link-create: POSTs /render/link with one source, data and expiresIn", async () => {
  const link = { url: "https://api.rendex.dev/v1/render?p=1", expiresAt: "2026-11-01T00:00:00Z" };
  const { ctx, calls } = mockCtx([{ body: envelope(link) }]);
  const out = await obj(
    await action.execute({
      html: "<h1>{{title}}</h1>",
      data: { title: "Launch" },
      width: 1200,
      height: 630,
      expiresIn: 3600,
    }, ctx),
  );
  assertEquals(pathOf(calls[0].url), "/v1/render/link");
  assertEquals(bodyOf(calls[0]), {
    html: "<h1>{{title}}</h1>",
    data: { title: "Launch" },
    width: 1200,
    height: 630,
    expiresIn: 3600,
  });
  assertEquals(out.url, link.url);
});

Deno.test("render-link-create: requires exactly one of url, html, markdown", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute({}, ctx), Error, "exactly one");
  await assertRejects(
    async () => await action.execute({ url: "https://a.b", markdown: "x" }, ctx),
    Error,
    "exactly one",
  );
  assertEquals(calls.length, 0);
});
