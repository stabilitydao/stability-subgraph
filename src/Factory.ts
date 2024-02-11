import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts"
import { ZeroBigInt, platformAddress, vaultManagerAddress, getBalanceAddress, priceReaderAddress} from './constants'
import { VaultTypeEntity, VaultEntity, StrategyEntity, StrategyConfigEntity, LastFeeAMLEntity, VaultAPRsEntity} from "../generated/schema"
import { VaultData, StrategyData, IchiQuickSwapMerklFarmData } from '../generated/templates'

import { PlatformABI           as PlatformContract        } from "../generated/PlatformData/PlatformABI"
import { VaultABI              as VaultContract           } from "../generated/templates/VaultData/VaultABI"
import { VaultConfigChanged    as VaultConfigChangedEvent,
         VaultStatus           as VaultStatusEvent,
         VaultProxyUpgraded    as VaultProxyUpgradedEvent,
         StrategyProxyUpgraded as StrategyProxyUpgradedEvent,
         StrategyLogicConfigChanged as StrategyLogicConfigChangedEvent,
         FactoryABI            as FactoryContract         } from "../generated/templates/FactoryData/FactoryABI"
import { StrategyBaseABI       as StrategyContract        } from "../generated/templates/StrategyData/StrategyBaseABI"
import { VaultManagerABI       as VaultManagerContract    } from "../generated/templates/VaultManagerData/VaultManagerABI"
import { VaultAndStrategy      as VaultAndStrategyEvent   } from "../generated/templates/FactoryData/FactoryABI"
import { getBalanceABI as GetBalanceContract } from "../generated/templates/StrategyData/getBalanceABI" 
import {PriceReaderABI as PriceReaderContract} from "../generated/templates/IchiQuickSwapMerklFarmData/PriceReaderABI" 

export function handleVaultAndStrategy(event: VaultAndStrategyEvent): void {
    const vault = new VaultEntity(event.params.vault);
    const strategyEntity = new StrategyEntity(event.params.strategy);

    const vaultTypeEntity = VaultTypeEntity.load(event.params.vaultType) as VaultTypeEntity;
    const strategyContract = StrategyContract.bind(event.params.strategy); 

    const vaultManagerContract = VaultManagerContract.bind(Address.fromString(vaultManagerAddress)); 
    const _vaultInfo = vaultManagerContract.vaultInfo(event.params.vault)
    const vaultContract = VaultContract.bind(event.params.vault); 
    const factoryContract = FactoryContract.bind(event.address);
    const priceReader = PriceReaderContract.bind(Address.fromString(priceReaderAddress));

    const underlying = strategyContract.underlying()
    if(event.params.strategyId == "Ichi QuickSwap Merkl Farm"){
      IchiQuickSwapMerklFarmData.create(strategyContract.underlying());
      const lastFeeAMLEntity = new LastFeeAMLEntity(underlying);
      lastFeeAMLEntity.vault = event.params.vault
      //lastFeeAMLEntity.APRS = [ZeroBigInt]
      lastFeeAMLEntity.APRS = []
      lastFeeAMLEntity.timestamps = [event.block.timestamp]
      lastFeeAMLEntity.save()
    }

    const vaultAPR24HEntity = new VaultAPRsEntity(event.params.vault)
    vaultAPR24HEntity.APRS = []
    vaultAPR24HEntity.timestamps = []
    vaultAPR24HEntity.save()

    VaultData.create(event.params.vault);
    StrategyData.create(event.params.strategy);

    //Calculate vault.AssetsPricesOnCreation//

    const _amounts: Array<BigInt> = []
    for(let i = 0; i < _vaultInfo.value1.length; i++){
      _amounts.push(ZeroBigInt)
    }

    const assetsPrices = priceReader.getAssetsPrice(_vaultInfo.value1, _amounts)
    
    vault.lastHardWork        = ZeroBigInt
    vault.totalSupply         = ZeroBigInt
    vault.apr                 = ZeroBigInt
    vault.tvl                 = ZeroBigInt
    vault.sharePrice          = ZeroBigInt
    vault.vaultUsersList      = []
    vault.strategy            = event.params.strategy 
    vault.vaultType           = event.params.vaultType
    vault.strategyId          = event.params.strategyId
    vault.name                = event.params.name
    vault.symbol              = event.params.symbol
    vault.color               = vaultTypeEntity.color
    vault.colorBackground     = vaultTypeEntity.colorBackground
    vault.deployAllowed       = vaultTypeEntity.deployAllowed
    vault.upgradeAllowed      = vaultTypeEntity.upgradeAllowed
    vault.version             = vaultContract.VERSION()
    vault.vaultBuildingPrice  = vaultTypeEntity.vaultBuildingPrice
    vault.underlying          = underlying
    vault.strategySpecific    = strategyContract.getSpecificName().value0
    vault.assetsProportions   = strategyContract.getAssetsProportions()
    vault.strategyDescription = strategyContract.description()
    vault.strategyAssets      = changetype<Bytes[]>(_vaultInfo.value1)
    vault.assetsWithApr       = changetype<Bytes[]>(_vaultInfo.value3)
    vault.assetsAprs          = _vaultInfo.value4
    vault.vaultStatus         = factoryContract.vaultStatus(event.params.vault)
    vault.hardWorkOnDeposit   = true
    vault.created             = event.block.timestamp
    vault.NFTtokenID          = vaultManagerContract.totalSupply().minus(BigInt.fromI32(1))
    vault.AssetsPricesOnCreation = assetsPrices.value2
    if(event.block.number > BigInt.fromI32(53088320)){
      const getBalanceContract    = GetBalanceContract.bind(Address.fromString(getBalanceAddress))
      vault.gasReserve = getBalanceContract.getBalance(event.params.vault)
    } 
    vault.save()

    //STRATEGY ENTITY
    let strategies = factoryContract.strategies()
    let index = strategies.value0.indexOf(event.params.strategyId)

    const colorBytes = strategies.value6[index]
    const color = changetype<Bytes>(colorBytes.slice(0, 3));
    const colorBackground = changetype<Bytes>(colorBytes.slice(3, 6));

    strategyEntity.strategyId = event.params.strategyId
    strategyEntity.version = strategyContract.VERSION()
    strategyEntity.tokenId = strategies.value4[index]
    //strategyEntity.shortName = 
    strategyEntity.color = color
    strategyEntity.colorBackground = colorBackground
    strategyEntity.save()

    //STRATEGY CONFIG ENTITY
    let stategyConfigEntity: StrategyConfigEntity
    if(!StrategyConfigEntity.load(event.params.strategyId)){
      stategyConfigEntity = new StrategyConfigEntity(event.params.strategyId);
    } else {
      stategyConfigEntity = StrategyConfigEntity.load(event.params.strategyId) as StrategyConfigEntity;
    }
    stategyConfigEntity.version = strategyContract.VERSION()
    stategyConfigEntity.save()
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

  export function handleVaultStatus(event: VaultStatusEvent): void {
    const vault = VaultEntity.load(event.params.vault) as VaultEntity;
    vault.vaultStatus = event.params.newStatus;
    vault.save() 
  }

  export function handleVaultProxyUpgraded(event: VaultProxyUpgradedEvent): void {
    const vault = VaultEntity.load(event.params.proxy) as VaultEntity;
    const vaultContract = VaultContract.bind(event.params.proxy); 
    vault.version = vaultContract.VERSION();
    vault.save() 
  }

  export function handleStrategyProxyUpgraded(event: StrategyProxyUpgradedEvent): void {
    const strategy = StrategyEntity.load(event.params.proxy) as StrategyEntity;
    const strategyContract = StrategyContract.bind(event.params.proxy); 
    strategy.version = strategyContract.VERSION();
    strategy.save() 
  }

  export function handleStrategyLogicConfigChanged(event: StrategyLogicConfigChangedEvent): void {
      let stategyConfigEntity: StrategyConfigEntity
      if(!StrategyConfigEntity.load(event.params.id)){
        stategyConfigEntity = new StrategyConfigEntity(event.params.id);
      } else {
        stategyConfigEntity = StrategyConfigEntity.load(event.params.id) as StrategyConfigEntity;
      }
      const strategyContract = StrategyContract.bind(event.params.implementation); 
      stategyConfigEntity.version = strategyContract.VERSION();
      stategyConfigEntity.save() 
  }
