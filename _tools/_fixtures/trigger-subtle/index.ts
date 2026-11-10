import type { AppDefinition, TriggerDefinition } from "@w6w/types";

/** Poll hook that hashes "abc" with `crypto.subtle` inside the sandbox worker (D3 proof). */
const subtle: TriggerDefinition = {
  key: "subtle",
  title: "Subtle",
  minIntervalMs: 120000,
  async poll() {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode("abc"),
    );
    const hex = [...new Uint8Array(digest)].map((b) =>
      b.toString(16).padStart(2, "0")
    ).join("");
    return { events: [{ hex }], nextState: { v: 1 } };
  },
};

export default { triggers: [subtle] } satisfies AppDefinition;
