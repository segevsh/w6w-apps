import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/droplet-get.ts";

const droplet = (attributes: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    droplet: {
      id: 3164444,
      name: "web-1",
      status: "active",
      disk: 25,
      size_slug: "s-1vcpu-1gb",
      region: { slug: "fra1" },
      volume_ids: ["vol-a"],
      tags: ["web"],
      networks: {
        // Deliberately private first — the array's order is not guaranteed.
        v4: [
          { ip_address: "10.114.0.5", type: "private" },
          { ip_address: "203.0.113.10", type: "public" },
        ],
      },
      ...attributes,
    },
  },
});

/** Indexing v4[0] gets whichever came first, often the private one. */
Deno.test("droplet-get: returns the public and private addresses separately", async () => {
  const { ctx } = mockCtx([droplet()]);
  const result = await action.execute({ dropletId: "3164444" }, ctx) as Record<string, unknown>;
  assertEquals(result.publicIp, "203.0.113.10");
  assertEquals(result.privateIp, "10.114.0.5");
  assert(/often the private one/.test(action.description!), action.description);
});

Deno.test("droplet-get: a droplet with only a public address has no private one", async () => {
  const { ctx } = mockCtx([droplet({
    networks: { v4: [{ ip_address: "203.0.113.10", type: "public" }] },
  })]);
  const result = await action.execute({ dropletId: "3164444" }, ctx) as Record<string, unknown>;
  assertEquals(result.privateIp, undefined);
});

/** These survive the droplet and keep billing. */
Deno.test("droplet-get: reports the volumes that would be left behind", async () => {
  const { ctx } = mockCtx([droplet()]);
  const result = await action.execute({ dropletId: "3164444" }, ctx) as Record<string, unknown>;
  assertEquals(result.volumeIds, ["vol-a"]);
  assertEquals(result.diskGb, 25);
});

Deno.test("droplet-get: a powered-off droplet is noted as still billing", async () => {
  const { ctx, logs } = mockCtx([droplet({ status: "off" })]);
  const result = await action.execute({ dropletId: "3164444" }, ctx) as Record<string, unknown>;
  assertEquals(result.billing, true);
  assert(/still billing/.test(logs[0].message), logs[0].message);
});

Deno.test("droplet-get: an archived droplet is the one that is not billing", async () => {
  const { ctx } = mockCtx([droplet({ status: "archive" })]);
  const result = await action.execute({ dropletId: "3164444" }, ctx) as Record<string, unknown>;
  assertEquals(result.billing, false);
});

Deno.test("droplet-get: a UUID where a number belongs is refused before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ dropletId: "506f78a4-e098-11e5-ad9f-000f53306ae1" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/must be a numeric id/.test(message), message);
  assertEquals(calls.length, 0);
});
