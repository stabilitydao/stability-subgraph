import { 
  Upgraded as UpgradedEvent,
  VaultAndStrategy as VaultAndStrategyEvent 
} from "../generated/StabilityDaoProxy/StabilityDaoProxy"
import { 
  Upgraded,
  VaultAndStrategy
} from "../generated/schema"

export function handleUpgraded(event: UpgradedEvent): void {
  let entity = new Upgraded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.implementation = event.params.implementation

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleVaultAndStrategy(event: VaultAndStrategyEvent): void {
  let entity = new VaultAndStrategy(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )

  entity.deployer = event.params.deployer
  entity.save()
}
