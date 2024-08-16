import { DataGoogleIamWorkloadIdentityPool } from "@cdktf/provider-google-beta/lib/data-google-iam-workload-identity-pool";
import { GoogleBetaProvider } from "@cdktf/provider-google-beta/lib/provider";
import { ProjectIamMember } from "@cdktf/provider-google/lib/project-iam-member";
import { GoogleProvider } from "@cdktf/provider-google/lib/provider";
import { RandomProvider } from "@cdktf/provider-random/lib/provider";
import { CurioStack } from "@curioswitch/cdktf-constructs";
import { GcsBackend, TerraformStack } from "cdktf";
import type { Construct } from "constructs";
import { Apps } from "./apps.js";
import { Database } from "./database.js";
import { Dns } from "./dns.js";
import { Hosting } from "./hosting.js";
import { Identity } from "./identity.js";
import { Secrets } from "./secrets.js";
import { ServiceAccounts } from "./service-accounts.js";

export interface TasukeConfig {
  environment: string;
  project: string;
  devProject?: string;
  domain: string;
  devDomain?: string;

  githubClientId: string;
  githubClientSecretCiphertext: string;
  githubAppId: number;
  githubAppPrivateKeyBase64Ciphertext: string;
}

export class TasukeStack extends TerraformStack {
  constructor(scope: Construct, config: TasukeConfig) {
    super(scope, config.environment);

    new GcsBackend(this, {
      bucket: `${config.project}-tfstate`,
    });

    new GoogleProvider(this, "google", {
      project: config.project,
      region: "us-central1",
      userProjectOverride: true,
    });

    const googleBeta = new GoogleBetaProvider(this, "google-beta", {
      project: config.project,
      region: "us-central1",
      userProjectOverride: true,
    });

    new RandomProvider(this, "random");

    const curiostack = new CurioStack(this, {
      project: config.project,
      location: "us-central1",
      domain: config.domain,
      githubRepo: "curioswitch/tasuke",
      googleBeta,
    });

    const githubIdPool = new DataGoogleIamWorkloadIdentityPool(
      this,
      "github-id-pool",
      {
        workloadIdentityPoolId: "github",
        provider: googleBeta,
      },
    );

    const githubTasukeIamMember = `principal://iam.googleapis.com/${githubIdPool.name}/subject/repo:curioswitch/tasuke:environment:${config.environment}`;

    new Database(this);

    new Identity(this, {
      project: config.project,
      domain: config.domain,
      githubClientId: config.githubClientId,
      githubClientSecretCiphertext: config.githubClientSecretCiphertext,
    });

    // Even owner permission does not allow creating impersonation tokens.
    new ProjectIamMember(this, "sysadmin-token-creator", {
      project: config.project,
      role: "roles/iam.serviceAccountTokenCreator",
      member: "group:sysadmin@curioswitch.org",
    });

    new ServiceAccounts(this, {
      project: config.project,
    });

    const secrets = new Secrets(this, {
      project: config.project,
      githubAppPrivateKeyBase64Ciphertext:
        config.githubAppPrivateKeyBase64Ciphertext,
    });

    new Apps(this, {
      project: config.project,
      githubAppId: config.githubAppId,
      secrets,
      curiostack,
    });

    const hosting = new Hosting(this, {
      project: config.project,
      domain: config.domain,
      githubRepoIamMember: githubTasukeIamMember,
      googleBeta,
    });

    new Dns(this, {
      project: config.project,
      domain: config.domain,
      devProject: config.devProject,
      devDomain: config.devDomain,
      firebaseDomain: hosting.customDomain,
    });
  }
}
