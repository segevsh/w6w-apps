import action from "../../actions/get-sender-identity.ts";
import { testGetById } from "../_shapes.ts";

testGetById("get-sender-identity", action, "identityId", "/v1/identities/{id}");
