import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts"
import { VaultAndStrategy as VaultAndStrategyEvent,
         VaultConfigChanged as VaultConfigChangedEvent
        } from "../generated/templates/FactoryData/FactoryABI"
import { BlueChipAdded as BlueChipAddedEvent} from "../generated/templates/SwapperData/SwapperABI"
import { Transfer as TransferEvent, VaultABI as VaultContract} from "../generated/templates/VaultData/VaultABI"
import { HardWork as HardWorkEvent} from "../generated/templates/StrategyData/StrategyLibABI"
import { 
  Addresses as AddressesEvent,
  ContractInitialized as ContractInitializedEvent,
  PlatformVersion as PlatformVersionEvent,
  AddDexAggregator as AddDexAggregatorEvent,
  PlatformABI as PlatformContract
} from "../generated/PlatformData/PlatformABI"

import { StrategyLibABI as StrategyContract} from "../generated/templates/StrategyData/StrategyLibABI"


import { 
  PlatformEntity,
  VaultEntity,
  VaultTypeEntity
} from "../generated/schema"

import { SwapperData, FactoryData, VaultData, StrategyData } from '../generated/templates'

const addressZero =     '0x0000000000000000000000000000000000000000'
const platformAddress = '0xb2a0737ef27b5cc474d24c779af612159b1c3e60'
const factoryAddress =  '0xa14EaAE76890595B3C7ea308dAEBB93863480EAD'

export function handleVaultAndStrategy(event: VaultAndStrategyEvent): void {
  const vault = new VaultEntity(event.params.vault);
  const vaultTypeEntity = VaultTypeEntity.load(event.params.vaultType) as VaultTypeEntity;
  VaultData.create(event.params.vault);
  StrategyData.create(event.params.strategy);

  vault.totalSupply = BigInt.fromI32(0)
  vault.apr = BigInt.fromI32(0)
  vault.tvl = BigInt.fromI32(0)
  vault.sharePrice = BigInt.fromI32(0)
  vault.strategy = event.params.strategy 
  vault.vaultType = event.params.vaultType
  vault.strategyId = event.params.strategyId
  vault.color = vaultTypeEntity.color
  vault.colorBackground = vaultTypeEntity.colorBackground
  vault.deployAllowed = vaultTypeEntity.deployAllowed
  vault.upgradeAllowed = vaultTypeEntity.upgradeAllowed
  vault.version = vaultTypeEntity.version
  vault.vaultBuildingPrice = vaultTypeEntity.vaultBuildingPrice
  vault.save()
}

export function handleAddresses(event: AddressesEvent): void {
  const platform = PlatformEntity.load(event.address) as PlatformEntity;
  const platformContract = PlatformContract.bind(event.address); 
  const result = platformContract.getData();
  SwapperData.create(event.params.swapper_);
  FactoryData.create(event.params.factory_); 

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
}

export function handleContractInitialized(event: ContractInitializedEvent): void {
  const platform = new PlatformEntity(event.params.platform);
  platform.save()
}

export function handlePlatformVersion(event: PlatformVersionEvent): void {
  const platform = PlatformEntity.load(event.address) as PlatformEntity;
  platform.version = event.params.version
  platform.save()
}

export function handleBlueChipAdded(event: BlueChipAddedEvent): void {
  const platform = PlatformEntity.load(Address.fromString(platformAddress)) as PlatformEntity;
  let bcAssets = platform.bcAssets
  if (!bcAssets) {
    bcAssets = [];
  }
  if(!bcAssets.includes(event.params.poolData.tokenIn)){
    bcAssets.push(event.params.poolData.tokenIn)
  }
  if(!bcAssets.includes(event.params.poolData.tokenOut)){
    bcAssets.push(event.params.poolData.tokenOut)
  }
  platform.bcAssets = bcAssets
  platform.save()
}  

export function handleAddDexAggregator(event: AddDexAggregatorEvent): void {
  const platform = PlatformEntity.load(Address.fromString(platformAddress)) as PlatformEntity;
  let dexAggreagators = platform.dexAggreagators
  if (!dexAggreagators) {
    dexAggreagators = [];
  }
  dexAggreagators.push(event.params.router)
  platform.dexAggreagators = dexAggreagators
  platform.save()
}

export function handleTransfer(event: TransferEvent): void {
  const vault = VaultEntity.load(event.address) as VaultEntity;
  const totalSupply = vault.totalSupply

  if(event.params.from == Address.fromString(addressZero)){
    vault.totalSupply = totalSupply.plus(event.params.value)
  }

  if(event.params.to == Address.fromString(addressZero)){
    vault.totalSupply = totalSupply.minus(event.params.value)
  } 
  vault.save()
}

export function handleHardWork(event: HardWorkEvent): void {
  const strategyContract = StrategyContract.bind(event.address); 
  const vaultAddress = strategyContract.vault();
  const assestProportions = strategyContract.getAssetsProportions();
  const vault = VaultEntity.load(vaultAddress) as VaultEntity; 
  vault.apr = event.params.apr
  vault.tvl = event.params.tvl
  vault.sharePrice = event.params.sharePrice
  vault.assetsProportions = assestProportions
  vault.save()
}

export function handleVaultConfigChanged(event: VaultConfigChangedEvent): void {
  const vaultTypeEntity = new VaultTypeEntity(event.params.type_);
  
  const platformContract = PlatformContract.bind(Address.fromString(platformAddress)); 
  const platformData = platformContract.getData();

  const colorBytes = platformData.value4
  const vaultTypes = platformData.value3

  const index = vaultTypes.indexOf(event.params.type_)
  let _colorBytes = colorBytes[index]
  const color = changetype<Bytes>(_colorBytes.slice(0, 3));
  const colorBackground = changetype<Bytes>(_colorBytes.slice(3, 6));

  const vaultBuildingPrice = platformData.value5[index]
  
  const vaultContract = VaultContract.bind(event.params.implementation); 

  vaultTypeEntity.deployAllowed = event.params.deployAllowed
  vaultTypeEntity.upgradeAllowed = event.params.upgradeAllowed
  vaultTypeEntity.color = color
  vaultTypeEntity.colorBackground = colorBackground
  vaultTypeEntity.version = vaultContract.VERSION()
  vaultTypeEntity.vaultBuildingPrice = vaultBuildingPrice
  vaultTypeEntity.save()
}


