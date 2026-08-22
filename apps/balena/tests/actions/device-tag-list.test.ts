import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-tag-list.ts";

const UUID = "a".repeat(32);
const tags = {
  status: 200,
  body: {
    d: [
      { id: 1, tag_key: "site", value: "berlin", device: { __id: 5 } },
      { id: 2, tag_key: "site", value: "berlin", device: { __id: 6 } },
      { id: 3, tag_key: "site", value: "munich", device: { __id: 7 } },
    ],
  },
};

/** The closest thing balena has to a sub-fleet. */
Deno.test("device-tag-list: finds every device carrying a key", async () => {
  const { ctx, calls } = mockCtx([tags]);
  const result = await action.execute({ key: "site" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).searchParams.get("$filter"), "tag_key eq 'site'");
  assertEquals(result.deviceCount, 3);
  assertEquals(result.devices, [5, 6, 7]);
  assertEquals(result.values, ["berlin", "munich"]);
});

Deno.test("device-tag-list: a key and value filter both go into the query", async () => {
  const { ctx, calls } = mockCtx([tags]);
  await action.execute({ key: "site", value: "berlin", fleet: "acme/sensors" }, ctx);
  const filter = new URL(calls[0].url).searchParams.get("$filter")!;
  assert(/tag_key eq 'site'/.test(filter), filter);
  assert(/value eq 'berlin'/.test(filter), filter);
  assert(/a\/slug eq 'acme\/sensors'/.test(filter), filter);
});

Deno.test("device-tag-list: a uuid reads one device's tags as a map", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      d: [
        { id: 1, tag_key: "site", value: "berlin", device: { __id: 5 } },
        { id: 4, tag_key: "revision", value: "2", device: { __id: 5 } },
      ],
    },
  }]);
  const result = await action.execute({ uuid: UUID }, ctx) as Record<string, unknown>;
  assert(new URL(calls[0].url).searchParams.get("$filter")!.includes(`d/uuid eq '${UUID}'`));
  assertEquals(result.byKey, { site: "berlin", revision: "2" });
});

/** An unfiltered listing is every tag in every fleet. */
Deno.test("device-tag-list: refuses to list everything", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => await action.execute({}, ctx), Error);
  assert(/every tag in every fleet/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

/** Everything is a string, matched exactly. */
Deno.test("device-tag-list: says values are strings matched exactly", () => {
  assert(/`version=2` does not find a device tagged `version=2\.0`/.test(action.description!));
});
