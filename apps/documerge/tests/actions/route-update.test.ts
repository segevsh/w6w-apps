import { assert, assertEquals, assertRejects } from "@std/assert";
import routeUpdate from "../../actions/route-update.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("route-update: PUT /api/routes/{routeId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const out = await routeUpdate.execute(
    {
      "routeId": 13,
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
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/routes/13");
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

Deno.test("route-update: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        routeUpdate.execute(
          {
            "routeId": 13,
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

Deno.test("route-update: idempotency is declared as true", () =>
  assertEquals(routeUpdate.idempotent, true));
