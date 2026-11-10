import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import invitationList from "../actions/invitation-list.ts";

const CAP = 100;

/**
 * Pending RECEIVED invitations are a small bounded set that shrinks as they are accepted or
 * declined (https://docs.linkupapi.com/api-reference/v2/network/list-invitations.md: "Total
 * number of pending invitations available on the account"). The doc names no order, so the whole
 * set is read in one request (count 100) and diffed as a snapshot keyed by `entity_urn`; only
 * additions emit. More than 100 pending fails the check with an error instead of reading part
 * of an unordered list. Billed 1 credit per 10 invitations returned, so the poll runs every 15
 * minutes.
 */
const trigger: TriggerDefinition = {
  key: "new-invitation",
  title: "New Received Invitation",
  description: "The run gets each connection invitation newly received by the selected account.",
  params: [{ key: "accountId", label: "Account ID", type: "string", required: true }],
  output: [
    { key: "entity_urn", type: "string", label: "Invitation URN" },
    { key: "type", type: "string", label: "Invitation type" },
  ],
  sample: { entity_urn: "urn:li:fsd_invitation:sample-1", type: "CONNECTION" },
  minIntervalMs: 900_000,
  async poll({ state, params }, ctx) {
    const result = await invitationList.execute({
      accountId: String((params as { accountId?: unknown }).accountId ?? ""),
      count: CAP,
      offset: 0,
    }, ctx) as { data?: { invitations?: unknown; pagination?: { has_more?: unknown } } };
    const invitations = Array.isArray(result?.data?.invitations) ? result.data.invitations : [];
    if (result?.data?.pagination?.has_more === true) {
      throw new Error(`LinkupAPI: more than ${CAP} pending invitations; clear some and retry`);
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: invitations.map((item: unknown) => ({
        key: String((item as { entity_urn?: unknown }).entity_urn ?? ""),
        values: item,
      })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
