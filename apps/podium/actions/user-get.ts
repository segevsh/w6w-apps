import type { ActionDefinition } from "@w6w/types";
import { encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  uid: string;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Get one user by uid. Requires scope `read_users`.",
  params: [{
    key: "uid",
    label: "User UID",
    type: "string",
    required: true,
  }],
  output: [{
    key: "archived",
    type: "boolean",
    label: "Weather the current user is archived",
  }, {
    key: "createdAt",
    type: "string",
    label: "When the user was created",
  }, {
    key: "email",
    type: "string",
    label: "The email of the current user",
  }, {
    key: "firstName",
    type: "string",
    label: "The first name of the current user",
  }, {
    key: "lastName",
    type: "string",
    label: "The last name of the current user",
  }, {
    key: "locations",
    type: "array",
    label: "locations",
  }, {
    key: "phone",
    type: "string",
    label: "The phone number of the user",
  }, {
    key: "role",
    type: "string",
    label: "The current positon of the user in the company",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for user",
  }, {
    key: "updatedAt",
    type: "string",
    label: "When the user was updated",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one(`/users/${encodeId(input.uid)}`);
  },
};

export default userGet;
