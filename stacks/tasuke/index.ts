import { DataGoogleIamWorkloadIdentityPool } from "@cdktf/provider-google-beta/lib/data-google-iam-workload-identity-pool";
import { GoogleBetaProvider } from "@cdktf/provider-google-beta/lib/provider";
import { GoogleProvider } from "@cdktf/provider-google/lib/provider";
import { GcsBackend, TerraformStack } from "cdktf";
import type { Construct } from "constructs";
import { Apps } from "./apps";
import { Database } from "./database";
import { Hosting } from "./hosting";
import { Identity } from "./identity";

export interface TasukeConfig {
  environment: string;
  project: string;
  domain: string;
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

    new Database(this);

    new Identity(this, {
      project: config.project,
      domain: config.domain,
    });

    new Apps(this, {
      project: config.project,
      domain: config.domain,
      environment: config.environment,
      githubIdPool: githubIdPool.name,
    });

    new Hosting(this, {
      project: config.project,
      domain: config.domain,
      googleBeta,
    });
  }
}
