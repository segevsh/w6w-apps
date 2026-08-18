import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/group-identify.ts";

Deno.test("group-identify: sends form-encoded JSON to /groupidentify", async () => {
  const { ctx, calls } = mockCtx([ok("success")], { display });
  const result = await action.execute!({
    groupType: "company",
    groupName: "Acme",
    groupProperties: '{"plan":"enterprise","seats":40}',
  }, ctx) as { groupType: string };
  assertEquals(calls[0].url, "https://api2.amplitude.com/groupidentify");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const form = new URLSearchParams(calls[0].body!);
  const identification = JSON.parse(form.get("identification")!)[0];
  assertEquals(identification.group_type, "company");
  assertEquals(identification.group_value, "Acme");
  assertEquals(identification.group_properties.seats, 40);
  assertEquals(result.groupType, "company");
});

Deno.test("group-identify: needs a type, a name and properties", async () => {
  for (
    const input of [
      { groupName: "Acme", groupProperties: '{"a":1}' },
      { groupType: "company", groupProperties: '{"a":1}' },
      { groupType: "company", groupName: "Acme", groupProperties: "{}" },
    ]
  ) {
    const { ctx, calls } = mockCtx([], { display });
    await assertRejects(async () => await action.execute!(input, ctx), Error, "required");
    assertEquals(calls.length, 0);
  }
});

/** Account properties are the caller's data. */
Deno.test("group-identify: logs the type and count, never the values", async () => {
  const { ctx, logs } = mockCtx([ok("success")], { display });
  await action.execute!({
    groupType: "company",
    groupName: "Acme",
    groupProperties: '{"contract":"secret terms"}',
  }, ctx);
  assert(!JSON.stringify(logs).includes("secret"), JSON.stringify(logs));
  assertEquals(logs[0].data, { groupType: "company", propertyCount: 1 });
});

/** Group analytics is a paid feature, and this endpoint accepts the request anyway. */
Deno.test("group-identify: warns that it succeeds on plans without group analytics", () => {
  assert(/paid feature/.test(action.description!), action.description);
  assert(/never appear/.test(action.description!), action.description);
});
