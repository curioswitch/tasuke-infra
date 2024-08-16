import { ProjectIamMember } from "@cdktf/provider-google/lib/project-iam-member";
import {
  type CurioStack,
  CurioStackService,
} from "@curioswitch/cdktf-constructs";
import { Construct } from "constructs";
import type { Secrets } from "./secrets.js";

export interface AppsConfig {
  project: string;
  githubAppId: number;

  curiostack: CurioStack;

  secrets: Secrets;
}

export class Apps extends Construct {
  constructor(scope: Construct, config: AppsConfig) {
    super(scope, "apps");

    const frontendServer = new CurioStackService(this, {
      name: "frontend-server",
      public: true,
      curiostack: config.curiostack,
    });

    new ProjectIamMember(this, "frontend-server-firestore", {
      project: config.project,
      role: "roles/datastore.user",
      member: frontendServer.serviceAccount.member,
    });

    const webhookServer = new CurioStackService(this, {
      name: "webhook-server",
      public: true,

      env: {
        GITHUB_APPID: config.githubAppId.toString(),
      },

      envSecrets: {
        GITHUB_SECRET: config.secrets.githubWebhookSecretSecretV1,
        GITHUB_PRIVATEKEYBASE64:
          config.secrets.githubAppPrivateKeyBase64SecretV1,
      },

      curiostack: config.curiostack,
    });

    new ProjectIamMember(this, "webhook-server-firestore", {
      project: config.project,
      role: "roles/datastore.user",
      member: webhookServer.serviceAccount.member,
    });
  }
}
