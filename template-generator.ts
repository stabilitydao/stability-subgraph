const mustache = require("mustache");
const fs = require("fs");

const networks = JSON.parse(fs.readFileSync("networks.json", "utf8"));
const selectedNetworkKey = process.argv[2] || "matic"; // matic || base || real
const selectedNetworkConfig = networks[selectedNetworkKey];

if (!selectedNetworkConfig) {
  console.error(
    `Configuration for network  "${selectedNetworkKey}" not found in networks.json`
  );
  process.exit(1);
}

const templates = {
  basic: "templates/basic.yaml.mustache",
  real: "templates/real.yaml.mustache",
  network: "templates/network.yaml.mustache",
};

const getTemplateContent = (templatePath) =>
  fs.readFileSync(templatePath, "utf8");

const template = getTemplateContent(
  selectedNetworkKey === "real" ? templates.real : templates.basic
);

const networkToDeployTemplate = getTemplateContent(templates.network);

const templateData = {
  network: selectedNetworkKey,
  address: selectedNetworkConfig.address,
  startBlock: selectedNetworkConfig.startBlock,
};

fs.writeFileSync(
  "subgraph.yaml",
  mustache.render(template, templateData),
  "utf8"
);

fs.writeFileSync(
  "src/utils/network.ts",
  mustache.render(networkToDeployTemplate, { network: selectedNetworkKey }),
  "utf8"
);

console.log(
  `subgraph.yaml for network ${selectedNetworkKey} created successfully!`
);
