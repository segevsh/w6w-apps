import action from "../../actions/delete-sender-identity.ts";
import { testDeleteById } from "../_shapes.ts";

testDeleteById("delete-sender-identity", action, "identityId", "/v1/identities/{id}", 204);
