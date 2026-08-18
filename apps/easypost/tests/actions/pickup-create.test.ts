import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pickup-create.ts";

const quoted = (rates: unknown[]) => ({ status: 200, body: { id: "pkp_1", pickup_rates: rates } });
const addr = '{"street1":"417 Montgomery St","zip":"94104"}';
const min = "2026-08-19T09:00:00Z";
const max = "2026-08-19T17:00:00Z";

Deno.test("pickup-create: posts a wrapped pickup with its window", async () => {
  const { ctx, calls } = mockCtx([quoted([])]);
  await action.execute!({ address: addr, minDatetime: min, maxDatetime: max }, ctx);
  assertEquals(calls[0].url, "https://api.easypost.com/v2/pickups");
  const body = JSON.parse(calls[0].body!).pickup;
  assertEquals(body.address.zip, "94104");
  assertEquals(body.min_datetime, min);
  assertEquals(body.max_datetime, max);
});

Deno.test("pickup-create: sorts the pickup rates numerically", async () => {
  const { ctx } = mockCtx([quoted([
    { id: "pr1", rate: "30.00" },
    { id: "pr2", rate: "9.99" },
  ])]);
  const result = await action.execute!(
    { address: addr, minDatetime: min, maxDatetime: max },
    ctx,
  ) as {
    cheapestRate: { id: string };
  };
  assertEquals(result.cheapestRate.id, "pr2");
});

/** A window that closes before it opens is a mistake, not a carrier problem. */
Deno.test("pickup-create: an inverted window is refused before the request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ address: addr, minDatetime: max, maxDatetime: min }, ctx),
    Error,
    "before it closes",
  );
  assertEquals(calls.length, 0);
});

Deno.test("pickup-create: needs an address and both ends of the window", async () => {
  const noAddr = mockCtx();
  await assertRejects(
    async () => await action.execute!({ minDatetime: min, maxDatetime: max }, noAddr.ctx),
    Error,
    "address",
  );
  const noWindow = mockCtx();
  await assertRejects(
    async () => await action.execute!({ address: addr }, noWindow.ctx),
    Error,
    "minDatetime",
  );
});

/** An unbought pickup means nobody comes. */
Deno.test("pickup-create: says it does not book anything", () => {
  assert(/does not book it/.test(action.description!), action.description);
});
