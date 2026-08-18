import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/media-upload.ts";

const PNG = "iVBORw0KGgo=";
const ready = ok({ id: "m1", url: "https://cdn/media/m1.png", type: "image" });
const processing = ok({ id: "m2", url: null, type: "video" });

Deno.test("media-upload: posts to v2 and returns the attachment id", async () => {
  const { ctx, calls } = mockCtx([ready], { display });
  const result = await action.execute!({ data: PNG, description: "a red square" }, ctx) as {
    id: string;
    processing: boolean;
    size: number;
  };
  assertEquals(calls[0].url, "https://mastodon.social/api/v2/media");
  assertEquals(calls[0].method, "POST");
  assertEquals(result.id, "m1");
  assertEquals(result.processing, false);
  assertEquals(result.size, 8);
});

/** v2 returns the id before the file is ready; attaching it early fails. */
Deno.test("media-upload: a null url means still processing, and says so", async () => {
  const { ctx, logs } = mockCtx([processing], { display });
  const result = await action.execute!({ data: PNG, description: "a clip" }, ctx) as {
    processing: boolean;
    url?: string;
  };
  assertEquals(result.processing, true);
  assertEquals(result.url, undefined);
  assert(/wait before attaching it/.test(logs[0].message), logs[0].message);
});

/** Many instances' rules require a description. */
Deno.test("media-upload: uploading without alt text warns", async () => {
  const { ctx, logs } = mockCtx([ready], { display });
  await action.execute!({ data: PNG }, ctx);
  assertEquals(logs[0].level, "warn");
  assert(/rules require a description/.test(logs[0].message), logs[0].message);
});

Deno.test("media-upload: a data: URL supplies its own mime type", async () => {
  const { ctx } = mockCtx([ready], { display });
  await action.execute!({ data: `data:image/webp;base64,${PNG}`, description: "x" }, ctx);
});

Deno.test("media-upload: invalid or empty base64 is refused", async () => {
  const bad = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ data: "!!!not base64!!!" }, bad.ctx),
    Error,
    "not valid base64",
  );
  const empty = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ data: "data:image/png;base64," }, empty.ctx),
    Error,
    "zero bytes",
  );
});

Deno.test("media-upload: needs data", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`data` is required");
  assertEquals(calls.length, 0);
});

Deno.test("media-upload: is non-idempotent and says v2 is asynchronous", () => {
  assertEquals(action.idempotent, false);
  assert(/ASYNCHRONOUS/.test(action.description!), action.description);
});
