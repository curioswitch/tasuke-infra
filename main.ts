import { App } from "cdktf";
import { TasukeStack } from "./stacks/tasuke";

const app = new App();

new TasukeStack(app, {
  environment: "dev",
  project: "tasuke-dev",
  domain: "alpha.tasuke.dev",
});

new TasukeStack(app, {
  environment: "prod",
  project: "tasuke-prod",
  devProject: "tasuke-dev",
  domain: "tasuke.dev",
  devDomain: "alpha.tasuke.dev",
});

app.synth();
