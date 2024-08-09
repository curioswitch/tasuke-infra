import { App } from "cdktf";
import { SysadminStack } from "./stacks/sysadmin/index.js";
import { TasukeStack } from "./stacks/tasuke/index.js";

const app = new App();

new SysadminStack(app);

new TasukeStack(app, {
  environment: "dev",
  project: "tasuke-dev",
  domain: "alpha.tasuke.dev",
  githubClientId: "Ov23ctQGntk45hLDYp90",
  githubClientSecretCiphertext:
    "CiQAXEJPaOVToTI/ZP1UgABZxb46MbFaGbG9rudZQIYCj2dODLESUQC761MooR3tZ+oT2IYATtegCK1EEg2SRtTfJY1P6XjE/X/ZHlXJjT35/JcdJm7y23ro9jUCwAj941R1RDsXjxZNRrDBXaEhcgDYjR1MPcbV2w==",
  githubAppId: 919302,
  githubAppPrivateKeyBase64Ciphertext:
    "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",
});

new TasukeStack(app, {
  environment: "prod",
  project: "tasuke-prod",
  devProject: "tasuke-dev",
  domain: "tasuke.dev",
  devDomain: "alpha.tasuke.dev",
  githubClientId: "Ov23liuHVqDlwcWqecY6",
  githubClientSecretCiphertext:
    "CiQAZMaw+7BP/irMmJ8eSU2HOwjqq7FCFb2eBS7B1gxcYCpfrKQSUQAg6KTI4Fvw72Q+pfAjLR34Qzrd2ChGWiuargOzu1M2h0XnB7k+vsNt6OswVxgZcX26Z6xJkSCRsxXoX2fhD46V2//lQeb/xlbAGPHhtNse/w==",
  githubAppId: 915169,
  githubAppPrivateKeyBase64Ciphertext:
    "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",
});

app.synth();
