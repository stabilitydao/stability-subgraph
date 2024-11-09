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

let template;

switch (selectedNetworkKey) {
  case "real":
    template = fs.readFileSync("templates/real.yaml.mustache", "utf8");
    break;
  default:
    template = fs.readFileSync("templates/basic.yaml.mustache", "utf8");
    break;
}

const templateData = {
  network: selectedNetworkKey,
  address: selectedNetworkConfig.address,
  startBlock: selectedNetworkConfig.startBlock,
};

const output = mustache.render(template, templateData);

fs.writeFileSync("subgraph.yaml", output, "utf8");

console.log(
  `subgraph.yaml for network ${selectedNetworkKey} created successfully!`
);
