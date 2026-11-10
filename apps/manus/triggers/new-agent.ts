import type { ActionDefinition } from "@w6w/types";
import { wholeListSnapshot } from "../lib/triggers.ts";
import agentList from "../actions/agent-list.ts";

/** The vendor returns this list whole, unpaginated and unsorted, so it is diffed by id (added rows only). */
export default wholeListSnapshot({
  key: "new-agent",
  title: "New Agent",
  description: "The run gets each newly created custom agent: id, nickname and description.",
  action: agentList as unknown as ActionDefinition,
  output: [
    { key: "id", type: "string", label: "Agent ID" },
    { key: "nickname", type: "string", label: "Nickname" },
    { key: "about", type: "string", label: "About" },
  ],
  sample: { id: "agent-1", nickname: "Research assistant", about: "Finds and summarises sources." },
});
