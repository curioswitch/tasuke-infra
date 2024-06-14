import { DataGoogleKmsSecret } from "@cdktf/provider-google/lib/data-google-kms-secret";
import { ProjectService } from "@cdktf/provider-google/lib/project-service";
import { SecretManagerSecret } from "@cdktf/provider-google/lib/secret-manager-secret";
import { SecretManagerSecretVersion } from "@cdktf/provider-google/lib/secret-manager-secret-version";
import { Password } from "@cdktf/provider-random/lib/password";
import { TerraformOutput } from "cdktf";
import { Construct } from "constructs";

type SecretsConfig = {
  project: string;
  githubAppPrivateKeyBase64Ciphertext: string;
};

export class Secrets extends Construct {
  public readonly githubAppPrivateKeyBase64SecretV1: SecretManagerSecretVersion;
  public readonly githubWebhookSecretSecretV1: SecretManagerSecretVersion;

  constructor(scope: Construct, config: SecretsConfig) {
    super(scope, "secrets");

    const cryptoKey = `${config.project}/global/terraform/secrets`;

    const secretsService = new ProjectService(this, "secretmanager", {
      service: "secretmanager.googleapis.com",
    });

    const githubAppPrivateKeyBase64Decrypted = new DataGoogleKmsSecret(
      this,
      "github-app-private-key-base64-decrypted",
      {
        ciphertext: config.githubAppPrivateKeyBase64Ciphertext,
        cryptoKey,
        dependsOn: [secretsService],
      },
    );

    const githubAppPrivateKeyBase64Secret = new SecretManagerSecret(
      this,
      "github-app-private-key-base64",
      {
        secretId: "github-app-private-key-base64",
        replication: {
          auto: {},
        },
        dependsOn: [secretsService],
      },
    );

    this.githubAppPrivateKeyBase64SecretV1 = new SecretManagerSecretVersion(
      this,
      "github-app-private-key-base64-v1",
      {
        secret: githubAppPrivateKeyBase64Secret.id,
        secretData: githubAppPrivateKeyBase64Decrypted.plaintext,
      },
    );

    const githubWebhookSecret = new Password(
      this,
      "github-webhook-secret-value",
      {
        length: 32,
      },
    );

    new TerraformOutput(this, "github-webhook-secret", {
      value: githubWebhookSecret.result,
      sensitive: true,
      staticId: true,
    });

    const githubWebhookSecretSecret = new SecretManagerSecret(
      this,
      "github-webhook-secret-secret",
      {
        secretId: "github-webhook-secret",
        replication: {
          auto: {},
        },
        dependsOn: [secretsService],
      },
    );

    this.githubWebhookSecretSecretV1 = new SecretManagerSecretVersion(
      this,
      "github-webhook-secret-v1",
      {
        secret: githubWebhookSecretSecret.id,
        secretData: githubWebhookSecret.result,
      },
    );
  }
}
