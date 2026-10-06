import { assert, assertEquals, assertRejects } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/add-custom-activity.ts";

Deno.test("add-custom-activity: identity", () => {
  assertEquals(action.key, "add-custom-activity");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "activity");
  assertEquals(action.idempotent, false);
});

Deno.test("add-custom-activity: sends POST /api/v1/activities/customactivity", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Uid: "x1" } }]);
  const result = await action.execute({
    entityType: 1,
    entityUid: "acc1",
    title: "Imported",
  } as never, connected(ctx));
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "acme.outseta.com");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/api/v1/activities/customactivity");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    Title: "Imported",
    ActivityType: 10,
    EntityType: 1,
    EntityUid: "acc1",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals((result as { Uid: string }).Uid, "x1");
  // The credential is the auth hook's job — no action writes it.
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("add-custom-activity: a failure names the status and the request", async () => {
  const { ctx } = mockCtx([{ status: 404 }]);
  const err = await assertRejects(async () => {
    await action.execute({
      entityType: 1,
      entityUid: "acc1",
      title: "Imported",
    } as never, connected(ctx));
  });
  assert((err as Error).message.includes("404"));
  assert((err as Error).message.includes("/api/v1/activities/customactivity"));
});
