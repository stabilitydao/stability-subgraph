const fs_ = require("fs");

type Pool = {
  name: string;
  poolAddress: string;
  aclManager: string;
  startBlock: number;
};

function templatePoolAddressProvider(network: string) {
  return `
  - kind: ethereum
    name: PoolAddressProvider
    network: ${network}
    source:
      abi: PoolAddressProviderABI
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities: []
      eventHandlers: []
      abis:
        - name: PoolAddressProviderABI
          file: ./abis/PoolAddressProviderABI.json
      file: ./src/liquidation/PoolAddressProvider.ts
`;
}

function templateACLManager(network: string) {
  return `
  - kind: ethereum
    name: ACLManager
    network: ${network}
    source:
      abi: ACLManagerABI
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities: []
      eventHandlers: []
      abis:
        - name: ACLManagerABI
          file: ./abis/ACLManagerABI.json
      file: ./src/liquidation/ACLManager.ts
`;
}

function templatePool(network: string) {
  return `
  - kind: ethereum
    name: Pool
    network: ${network}
    source:
      abi: PoolABI
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities: []
      eventHandlers: []
      abis:
        - name: PoolABI
          file: ./abis/PoolABI.json
        - name: ERC20
          file: ./abis/ERC20UpgradeableABI.json
        - name: PriceOracle
          file: ./abis/PriceOracleABI.json
      file: ./src/liquidation/Pool.ts
`;
}

function dsACLManager(pool: Pool, network: string) {
  return `
  - kind: ethereum
    name: ${pool.name}-ACLManager
    network: ${network}
    source:
      address: "${pool.aclManager}"
      abi: ACLManagerABI
      startBlock: ${pool.startBlock}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - ACLRole
      abis:
        - name: ACLManagerABI
          file: ./abis/ACLManagerABI.json
        - name: PoolAddressProviderABI
          file: ./abis/PoolAddressProviderABI.json
      eventHandlers:
        - event: RoleGranted(indexed bytes32,indexed address,indexed address)
          handler: handleRoleGranted
        - event: RoleRevoked(indexed bytes32,indexed address,indexed address)
          handler: handleRoleRevoked
      file: ./src/liquidation/ACLManager.ts
`;
}

function dsPool(pool: Pool, network: string) {
  return `
  - kind: ethereum
    name: ${pool.name}-Pool
    network: ${network}
    source:
      address: "${pool.poolAddress}"
      abi: PoolABI
      startBlock: ${pool.startBlock}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - LiquidationEntity
      abis:
        - name: PoolABI
          file: ./abis/PoolABI.json
        - name: PoolAddressProviderABI
          file: ./abis/PoolAddressProviderABI.json
        - name: ERC20
          file: ./abis/ERC20UpgradeableABI.json
        - name: PriceOracle
          file: ./abis/PriceOracleABI.json
      eventHandlers:
        - event: Supply(indexed address,address,indexed address,uint256,indexed uint16)
          handler: handleSupply
        - event: Withdraw(indexed address,indexed address,indexed address,uint256)
          handler: handleWithdraw
        - event: Borrow(indexed address,address,indexed address,uint256,uint8,uint256,indexed uint16)
          handler: handleBorrow
        - event: Repay(indexed address,indexed address,indexed address,uint256,bool)
          handler: handleRepay
        - event: LiquidationCall(indexed address,indexed address,indexed address,uint256,uint256,address,bool)
          handler: handleLiquidationCall
        - event: FlashLoan(indexed address,address,indexed address,uint256,uint8,uint256,indexed uint16)
          handler: handleFlashLoan
      file: ./src/liquidation/Pool.ts
`;
}

function generate() {
  const networks = JSON.parse(fs_.readFileSync("networks.json", "utf8"));
  const selectedNetworkKey = process.argv[2] || "matic";

  if (!networks[selectedNetworkKey]) {
    console.error(
      `Configuration for network  "${selectedNetworkKey}" not found in networks.json`
    );
    process.exit(1);
  }

  const allPools = JSON.parse(fs_.readFileSync("pools.json", "utf8"));

  if (!allPools[selectedNetworkKey]) {
    console.error(
      `Configuration for network  "${selectedNetworkKey}" not found in pools.json`
    );
    process.exit(1);
  }

  const pools: { [key: string]: Pool } = allPools[selectedNetworkKey];

  let ds = Object.values(pools)
    .map(
      (pool) =>
        dsPool(pool, selectedNetworkKey) +
        dsACLManager(pool, selectedNetworkKey)
    )
    .join("\n");

  let templates = [
    templatePoolAddressProvider(selectedNetworkKey),
    templateACLManager(selectedNetworkKey),
    templatePool(selectedNetworkKey),
  ].join("\n");

  const template = fs_.readFileSync(
    "./templates/schema-liquidation.yaml.mustache",
    "utf8"
  );
  const finalYaml = template
    .replace("{{dataSources}}", ds)
    .replace("{{templates}}", templates);

  fs_.writeFileSync("./subgraph.yaml", finalYaml);
}

generate();
