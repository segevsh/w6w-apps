import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { display } from "./_shared.ts";
import action from "../../actions/camera-snapshot.ts";

const image = {
  status: 200,
  body: "PNGDATA",
  headers: { "content-type": "image/png" },
};

/** Every other endpoint answers JSON; this one answers image bytes. */
test("camera-snapshot: fetches the proxy and returns base64 with a data URL", async () => {
  const { ctx, calls } = mockCtx([image], { display });
  const result = await action.execute!({ entityId: "camera.front_door" }, ctx) as {
    data: string;
    dataUrl: string;
    contentType: string;
    size: number;
  };
  assertEquals(calls[0].url, "https://abc.ui.nabu.casa/api/camera_proxy/camera.front_door");
  assertEquals(calls[0].headers["accept"], "image/*");
  assertEquals(result.contentType, "image/png");
  assert(result.dataUrl.startsWith("data:image/png;base64,"), result.dataUrl);
  assertEquals(result.size > 0, true);
});

test("camera-snapshot: a non-camera entity is refused before the request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ entityId: "light.kitchen" }, ctx),
    Error,
    "must be a camera entity",
  );
  assertEquals(calls.length, 0);
});

test("camera-snapshot: a friendly name is refused", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ entityId: "Front Door" }, ctx),
    Error,
    "friendly name",
  );
});

/** A 404 here means the entity exists but has no image right now. */
test("camera-snapshot: a 404 is explained as no image rather than no camera", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }], { display });
  const error = await assertRejects(
    async () => await action.execute!({ entityId: "camera.front_door" }, ctx),
    Error,
  );
  assert(/no image right now/.test(error.message), error.message);
});

/** Whatever the proxy declares is what comes back, JPEG or PNG. */
test("camera-snapshot: the declared content type is carried through", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "JPEGDATA",
    headers: { "content-type": "image/jpeg" },
  }], { display });
  const result = await action.execute!({ entityId: "camera.x" }, ctx) as {
    contentType: string;
    dataUrl: string;
  };
  assertEquals(result.contentType, "image/jpeg");
  assert(result.dataUrl.startsWith("data:image/jpeg;base64,"), result.dataUrl);
});

test("camera-snapshot: needs an entity", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`entityId` is required");
});

test("camera-snapshot: logs size and type, never the bytes", async () => {
  const { ctx, logs } = mockCtx([image], { display });
  await action.execute!({ entityId: "camera.front_door" }, ctx);
  assertEquals(logs[0].data, { size: 7, contentType: "image/png" });
});

/** The proxy returns whatever the integration last received. */
test("camera-snapshot: says the frame may be old", () => {
  assert(/may be an old frame/.test(action.description!), action.description);
});
