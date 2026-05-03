import { createAuthClient } from "better-auth/react";
import { sentinelClient } from "@better-auth/infra/client";

export const { signIn, signUp, useSession } = createAuthClient({
  plugins: [
    sentinelClient()
  ]
});
