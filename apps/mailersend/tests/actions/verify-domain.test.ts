import action from "../../actions/verify-domain.ts";
import { testGetById } from "../_shapes.ts";

testGetById("verify-domain", action, "domainId", "/v1/domains/{id}/verify");
