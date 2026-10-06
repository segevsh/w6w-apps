import type { ActionDefinition } from "@w6w/types";
import { KudosityClient } from "../lib/client.ts";

/**
 * `POST /v2/rcs/capabilities` — a read in spite of the verb: no message is sent. Results are
 * best-effort; the vendor says not to use them as a hard gate and to treat `UNKNOWN` as reachable.
 */
interface Input {
  sender: string;
  phoneNumbers: string[] | string;
}

const rcsCapabilityCheck: ActionDefinition<Input> = {
  key: "rcs-capability-check",
  type: "read",
  resource: "rcs",
  title: "Check RCS Capability",
  description: "Check whether phone numbers can receive RCS from your agent, to choose between " +
    "RCS and SMS before sending.",
  params: [
    { key: "sender", label: "RCS agent ID", type: "string", required: true },
    {
      key: "phoneNumbers",
      label: "Phone numbers",
      type: "json",
      required: true,
      hint: 'JSON array of E.164 numbers without the plus, e.g. ["61491570156"]. 1-100 numbers; ' +
        "1-10 recommended for latency.",
    },
  ],
  output: [
    {
      key: "results",
      type: "array",
      label: "Per-number results ({phone_number, code}; code is ENABLED, UNREACHABLE, …)",
    },
  ],

  async execute(input, ctx) {
    const numbers = typeof input.phoneNumbers === "string"
      ? JSON.parse(input.phoneNumbers) as string[]
      : input.phoneNumbers;
    const { data } = await new KudosityClient(ctx).data<{ results?: unknown[] }>(
      "/rcs/capabilities",
      { method: "POST", body: { sender: input.sender, phone_numbers: numbers } },
    );
    return { results: data?.results ?? [] };
  },
};

export default rcsCapabilityCheck;
