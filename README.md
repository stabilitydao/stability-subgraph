# stability-subgraph

## Polygon

QUERIES (HTTP)
https://gateway-arbitrum.network.thegraph.com/api/[api-key]/subgraphs/id/7WgM7jRzoW7yiJCE8DMEwCxtN3KLisYrVVShuAL2Kz4N

WEB
https://thegraph.com/explorer/subgraphs/7WgM7jRzoW7yiJCE8DMEwCxtN3KLisYrVVShuAL2Kz4N?v=0&view=Playground&chain=arbitrum-one

## Base

QUERIES (HTTP)
https://gateway.thegraph.com/api/[api-key]/subgraphs/id/
FRK5vEJXX9w5Pt3nqeqGRX5s7k29AWCb7aXTfDwT6S8j

WEB
https://thegraph.com/explorer/subgraphs/FRK5vEJXX9w5Pt3nqeqGRX5s7k29AWCb7aXTfDwT6S8j?
view=Query&chain=arbitrum-one

## Real

WEB + QUERIES (HTTP)
https://api.goldsky.com/api/public/project_cm2v16o5ct0ql01vr3m5o0vt2/subgraphs/stability-subgraph/0.0.12/gn

## Multichain Deployment Workflow

Follow these steps to prepare and deploy a subgraph across multiple networks:

1. Run the prepare command with the target network. Example: `yarn prepare matic`
2. Execute the following commands to reset and prepare the subgraph: `yarn clean && yarn codegen & yarn build`
3. Authenticate with `graph auth <flag> <key>`
4. Deploy with `graph deploy <flag> <name>`
