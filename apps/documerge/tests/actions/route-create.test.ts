import { assert, assertEquals, assertRejects } from "@std/assert";
import routeCreate from "../../actions/route-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("route-create: POST /api/routes", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const out = await routeCreate.execute(
    {
      "name": "Onboarding pack",
      "outputName": "pack",
      "folder": "Packs",
      "timezone": "US/Eastern",
      "addWatermark": true,
      "watermarkText": "DRAFT",
      "rules": [{ "document_id": 7 }],
    } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/routes");
  assertEquals(out, { data: { id: 1 } });
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "Onboarding pack",
    "output_name": "pack",
    "folder": "Packs",
    "timezone": "US/Eastern",
    "add_watermark": true,
    "watermark_text": "DRAFT",
    "rules": [{ "document_id": 7 }],
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("route-create: unset optional fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  await routeCreate.execute({ "name": "Onboarding pack" } as never, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)).sort(), ["name"]);
});

Deno.test("route-create: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        routeCreate.execute(
          {
            "name": "Onboarding pack",
            "outputName": "pack",
            "folder": "Packs",
            "timezone": "US/Eastern",
            "addWatermark": true,
            "watermarkText": "DRAFT",
            "rules": [{ "document_id": 7 }],
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});

Deno.test("route-create: idempotency is declared as false", () =>
  assertEquals(routeCreate.idempotent, false));
