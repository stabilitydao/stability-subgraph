import { Address, Bytes } from "@graphprotocol/graph-ts"
import { VaultAndStrategy as VaultAndStrategyEvent} from "../generated/templates/FactoryData/FactoryABI"
import { BlueChipAdded as BlueChipAddedEvent} from "../generated/templates/SwapperData/SwapperABI"
import { 
  Addresses as AddressesEvent,
  ContractInitialized as ContractInitializedEvent,
  PlatformVersion as PlatformVersionEvent,
  AddDexAggregator as AddDexAggregatorEvent,
  PlatformABI as PlatformContract 
} from "../generated/PlatformData/PlatformABI"

import { 
  PlatformEntity,
  VaultEntity,
  SwapperEntity
} from "../generated/schema"

import { SwapperData } from '../generated/templates'

const platformAddress = '0xb2a0737ef27b5cc474d24c779af612159b1c3e60'

export function handleVaultAndStrategy(event: VaultAndStrategyEvent): void {
  let entity = new VaultEntity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.deployer = event.params.deployer
  entity.vaultType = event.params.vaultType
  entity.strategyId = event.params.strategyId
  entity.strategy = event.params.strategy
  entity.name = event.params.name
  entity.symbol = event.params.symbol
  entity.assets = changetype<Bytes[]>(event.params.assets)
  entity.deploymentKey = event.params.deploymentKey
  entity.vaultManagerTokenId = event.params.vaultManagerTokenId
  entity.save()
}

export function handleAddresses(event: AddressesEvent): void {
    let platform = PlatformEntity.load(event.address) as PlatformEntity;
    let platformContract = PlatformContract.bind(event.address); 
    let result = platformContract.getData();
    let swapper = new SwapperEntity(event.params.swapper_);
    SwapperData.create(event.params.swapper_);

    platform.multisig = event.params.multisig_
    platform.factory = event.params.factory_
    platform.vaultManager = event.params.vaultManager_
    platform.strategyLogic = event.params.strategyLogic_
    platform.buildingPermitToken = event.params.buildingPermitToken_
    platform.zap = event.params.zap
    platform.bridge = event.params.bridge
    platform.swapper = event.params.swapper_
    platform.buildingPayPerVaultToken = result.value0[4]
    platform.governance = result.value0[5]
    platform.save()
    swapper.save()
}

export function handleContractInitialized(event: ContractInitializedEvent): void {
  const platform = new PlatformEntity(event.params.platform);
  platform.save()
}

export function handlePlatformVersion(event: PlatformVersionEvent): void {
  let platform = PlatformEntity.load(event.address) as PlatformEntity;
  platform.version = event.params.version
  platform.save()
}

export function handleBlueChipAdded(event: BlueChipAddedEvent): void {
  let platform = PlatformEntity.load(Address.fromString(platformAddress)) as PlatformEntity;
  platform.bcAssets = changetype<Bytes[]>([event.params.poolData.tokenIn,event.params.poolData.tokenOut])
  platform.save()
}  

export function handleAddDexAggregator(event: AddDexAggregatorEvent): void {
  let platform = PlatformEntity.load(Address.fromString(platformAddress)) as PlatformEntity;

  let dexAggreagators = platform.dexAggreagators
  if (!dexAggreagators) {
    dexAggreagators = [];
  }
  dexAggreagators.push(event.params.router)
  platform.dexAggreagators = dexAggreagators
  platform.save()
}
