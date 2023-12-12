import { Bytes } from "@graphprotocol/graph-ts"
import { VaultAndStrategy as VaultAndStrategyEvent} from "../generated/FactoryData/FactoryABI"
import { ContractInitialized as ContractInitializedEvent} from "../generated/InitializeData/ProxyDataABI"
import { 
  InitializeEntity,
  VaultsListEntity
} from "../generated/schema"

export function handleVaultAndStrategy(event: VaultAndStrategyEvent): void {
  let entity = new VaultsListEntity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  
  entity.deployer = event.params.deployer
  entity.vaultType = event.params.vaultType
  entity.strategyId = event.params.strategyId
  entity.vault = event.params.vault
  entity.strategy = event.params.strategy
  entity.name = event.params.name
  entity.symbol = event.params.symbol
  entity.assets = changetype<Bytes[]>(event.params.assets)
  entity.deploymentKey = event.params.deploymentKey
  entity.vaultManagerTokenId = event.params.vaultManagerTokenId
  entity.save()
}

export function handleInitializeEntity(event: ContractInitializedEvent): void {
  let entity = new InitializeEntity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.platform = event.params.platform
  entity.ts = event.params.ts
  entity.block = event.params.block
  entity.save()
}
