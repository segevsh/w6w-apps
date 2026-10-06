import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/extract-image.ts";
import { mockCtx, run } from "../_helpers.ts";
import { ARTICLE_DOC } from "../_fixtures.ts";

Deno.test("extract-image: GETs /v3/image with the url and shapes the objects", async () => {
  const { ctx, calls } = mockCtx([{ body: ARTICLE_DOC }]);
  const out = await run(action, { url: "https://example.com/x", fields: "links, meta" }, ctx);
  const u = new URL(calls[0].url);
  assertEquals(u.origin + u.pathname, "https://api.diffbot.com/v3/image");
  assertEquals(calls[0].method, "GET");
  assertEquals(u.searchParams.get("url"), "https://example.com/x");
  assertEquals(u.searchParams.get("fields"), "links,meta");
  assertEquals(u.searchParams.has("token"), false);
  assertEquals(out.count, 1);
  assertEquals(out.object, out.objects[0]);
  assertEquals(out.humanLanguage, "en");
});

Deno.test("extract-image: no objects gives a null object; an error body or a 4xx throws", async () => {
  const empty = mockCtx([{ body: { request: {}, objects: [] } }]);
  const out = await run(action, { url: "https://e.com" }, empty.ctx);
  assertEquals(out.count, 0);
  assertEquals(out.object, null);

  const soft = mockCtx([{ body: { errorCode: 404, error: "Could not download page (404)" } }]);
  await assertRejects(
    () => run(action, { url: "https://e.com" }, soft.ctx),
    Error,
    "Could not download",
  );

  const hard = mockCtx([{
    status: 401,
    body: { code: 401, message: "Unauthorized. Incorrect token." },
  }]);
  const err = await assertRejects(
    () => run(action, { url: "https://e.com" }, hard.ctx),
    Error,
    "401",
  );
  assert(err.message.includes("Incorrect token"));
});
