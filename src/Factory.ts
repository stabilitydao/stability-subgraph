import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts"
import { platformAddress, vaultManagerAddress } from './constants'
import { VaultTypeEntity, VaultEntity, StategyEntity } from "../generated/schema"
import { VaultData, StrategyData } from '../generated/templates'

import { PlatformABI        as PlatformContract        } from "../generated/PlatformData/PlatformABI"
import { VaultABI           as VaultContract           } from "../generated/templates/VaultData/VaultABI"
import { VaultConfigChanged as VaultConfigChangedEvent } from "../generated/templates/FactoryData/FactoryABI"
import { StrategyBaseABI    as StrategyContract        } from "../generated/templates/StrategyData/StrategyBaseABI"
import { VaultManagerABI    as VaultManagerContract    } from "../generated/templates/VaultManagerData/VaultManagerABI"
import { VaultAndStrategy   as VaultAndStrategyEvent   } from "../generated/templates/FactoryData/FactoryABI"

export function handleVaultAndStrategy(event: VaultAndStrategyEvent): void {
    const vault = new VaultEntity(event.params.vault);
    const vaultTypeEntity = VaultTypeEntity.load(event.params.vaultType) as VaultTypeEntity;

    //const stategyEntity = StategyEntity.load(event.params.strategy) as StategyEntity;
    const strategyContract = StrategyContract.bind(event.params.strategy); 

    const vaultManagerContract = VaultManagerContract.bind(Address.fromString(vaultManagerAddress)); 
    const _vaultInfo = vaultManagerContract.vaultInfo(event.params.vault)
    VaultData.create(event.params.vault);
    StrategyData.create(event.params.strategy);
    
    vault.lastHardWork        = BigInt.fromI32(0)
    vault.totalSupply         = BigInt.fromI32(0)
    vault.apr                 = BigInt.fromI32(0)
    vault.tvl                 = BigInt.fromI32(0)
    vault.sharePrice          = BigInt.fromI32(0)
    vault.strategy            = event.params.strategy 
    vault.vaultType           = event.params.vaultType
    vault.strategyId          = event.params.strategyId
    vault.name                = event.params.name
    vault.symbol              = event.params.symbol
    vault.color               = vaultTypeEntity.color
    vault.colorBackground     = vaultTypeEntity.colorBackground
    vault.deployAllowed       = vaultTypeEntity.deployAllowed
    vault.upgradeAllowed      = vaultTypeEntity.upgradeAllowed
    vault.version             = vaultTypeEntity.version
    vault.vaultBuildingPrice  = vaultTypeEntity.vaultBuildingPrice
    vault.underlying          = strategyContract.underlying()
    vault.strategySpecific    = strategyContract.getSpecificName().value0
    vault.assetsProportions   = strategyContract.getAssetsProportions()
    vault.strategyDescription = strategyContract.description()
    vault.strategyAssets      = changetype<Bytes[]>(_vaultInfo.value1)
    vault.assetsWithApr       = changetype<Bytes[]>(_vaultInfo.value3)
    vault.assetsAprs          = _vaultInfo.value4
    
    vault.save()
   /*  
    const platformContract = PlatformContract.bind(Address.fromString(platformAddress)); 
    const platformData     = platformContract.getData();

    const index = platformData.value6.indexOf(event.params.type_)
    stategyEntity.strategyId = platformData


    strategyId - getData
    tokenId - totalSupply - 1
    shortName - getSpecificName()
    color, bgColor (strategyExtra) - getData
    version StrategyLogic.VERSION()
    */
  }

export function handleVaultConfigChanged(event: VaultConfigChangedEvent): void {
    const vaultTypeEntity = new VaultTypeEntity(event.params.type_);
    
    const platformContract = PlatformContract.bind(Address.fromString(platformAddress)); 
    const platformData     = platformContract.getData();
  
    const colorBytes = platformData.value4
    const vaultTypes = platformData.value3
  
    const index = vaultTypes.indexOf(event.params.type_)
    const _colorBytes = colorBytes[index]
    const color = changetype<Bytes>(_colorBytes.slice(0, 3));
    const colorBackground = changetype<Bytes>(_colorBytes.slice(3, 6));
    
    const vaultContract = VaultContract.bind(event.params.implementation); 
  
    vaultTypeEntity.version            = vaultContract.VERSION()
    vaultTypeEntity.color              = color
    vaultTypeEntity.colorBackground    = colorBackground
    vaultTypeEntity.deployAllowed      = event.params.deployAllowed
    vaultTypeEntity.upgradeAllowed     = event.params.upgradeAllowed
    vaultTypeEntity.vaultBuildingPrice = platformData.value5[index]

    vaultTypeEntity.save()
  }