# stability-subgraph

## Deployments

### Polygon

QUERIES (HTTP)
https://gateway-arbitrum.network.thegraph.com/api/[api-key]/subgraphs/id/7WgM7jRzoW7yiJCE8DMEwCxtN3KLisYrVVShuAL2Kz4N

WEB
https://thegraph.com/explorer/subgraphs/7WgM7jRzoW7yiJCE8DMEwCxtN3KLisYrVVShuAL2Kz4N?v=0&view=Playground&chain=arbitrum-one

### Base

QUERIES (HTTP)
https://gateway.thegraph.com/api/[api-key]/subgraphs/id/FRK5vEJXX9w5Pt3nqeqGRX5s7k29AWCb7aXTfDwT6S8j

WEB
https://thegraph.com/explorer/subgraphs/FRK5vEJXX9w5Pt3nqeqGRX5s7k29AWCb7aXTfDwT6S8j?view=Query&chain=arbitrum-one

### Sonic

Queries (HTTP): https://api.studio.thegraph.com/query/72279/stability-sonic/v0.0.16

WEB https://thegraph.com/explorer/subgraphs/CGkgsqaECPXXvgLySMMyzXTQh3v1zqqGTa1uRf5AbpZx?view=Query&chain=arbitrum-one

## How to dev

### Multichain Deployment Workflow

Follow these steps to prepare and deploy a subgraph across multiple networks:

1. Run the prepare command with the target network. Example: `yarn prepare matic`
2. Execute the following commands to reset and prepare the subgraph: `yarn clean && yarn codegen && yarn build`
3. Authenticate with `graph auth --studio <key>`
4. Deploy with `graph deploy <name>` or `goldsky subgraph deploy stability-sonic/<version> --path .`

### Add chain

1. Add to networks.json
2. Add to functions.ts
3. Add to constants.ts
