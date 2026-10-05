import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscription-get.ts";

const D = { display: { region: "us" } };

Deno.test("subscription-get: returns both product blocks", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      passwordManager: { seats: 50, maxAutoScaleSeats: 80, storage: 1 },
      secretsManager: null,
    },
  }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.bitwarden.com/public/organization/subscription");
  assertEquals((result.passwordManager as { seats: number }).seats, 50);
  assertEquals(result.secretsManager, null);
});
