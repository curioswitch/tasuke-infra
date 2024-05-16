import { DataGoogleIamWorkloadIdentityPool } from "@cdktf/provider-google-beta/lib/data-google-iam-workload-identity-pool";
import { GoogleBetaProvider } from "@cdktf/provider-google-beta/lib/provider";
import { ProjectIamMember } from "@cdktf/provider-google/lib/project-iam-member";
import { GoogleProvider } from "@cdktf/provider-google/lib/provider";
import { GcsBackend, TerraformStack } from "cdktf";
import type { Construct } from "constructs";
import { Apps } from "./apps";
import { Database } from "./database";
import { Dns } from "./dns";
import { Hosting } from "./hosting";
import { Identity } from "./identity";
import { ServiceAccounts } from "./service-accounts";

export interface TasukeConfig {
  environment: string;
  project: string;
  devProject?: string;
  domain: string;
  devDomain?: string;

  githubClientId: string;
  githubClientSecretCiphertext: string;
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

    const githubIdPool = new DataGoogleIamWorkloadIdentityPool(
      this,
      "github-id-pool",
      {
        workloadIdentityPoolId: "github",
        provider: googleBeta,
      },
    );

    const githubTasukeIamMember = `principalSet://iam.googleapis.com/${githubIdPool.name}/attribute.repository/curioswitch/tasuke`;

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

    new Apps(this, {
      project: config.project,
      domain: config.domain,
      environment: config.environment,
      githubRepoIamMember: githubTasukeIamMember,
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
