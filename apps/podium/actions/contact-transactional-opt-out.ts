import type { ActionDefinition } from "@w6w/types";
import { compact, PodiumClient } from "../lib/client.ts";

interface Input {
  phoneNumber: string;
  locationUid: string;
  channelType?: string;
}

const contactTransactionalOptOut: ActionDefinition<Input> = {
  key: "contact-transactional-opt-out",
  type: "perform",
  resource: "contact",
  title: "Opt Contact Out of Transactional Messages",
  description:
    "Opt a phone number out of transactional messages (the state a STOP reply produces). Opting out an already opted-out number succeeds. Podium requires your application to be whitelisted by support. Requires scope `write_contacts`.",
  idempotent: true,
  params: [{
    key: "phoneNumber",
    label: "Phone number",
    type: "string",
    required: true,
    hint: "Phone number in E.164 form (e.g. +15555550123).",
  }, {
    key: "locationUid",
    label: "Location UID",
    type: "string",
    required: true,
    hint: "Podium location uid.",
  }, {
    key: "channelType",
    label: "Channel type",
    type: "select",
    options: [{
      value: "PHONE",
      label: "PHONE",
    }],
    default: "PHONE",
  }],
  output: [{
    key: "identifier",
    type: "string",
    label: "Identifier of the contact that can be used to retrieve the contact",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one("/contacts/transactional/opt_out", {
      method: "POST",
      body: compact({
        channel: {
          identifier: input.phoneNumber,
          type: input.channelType ?? "PHONE",
        },
        locationUid: input.locationUid,
      }),
    });
  },
};

export default contactTransactionalOptOut;
