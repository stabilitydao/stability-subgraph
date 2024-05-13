import { Address, Bytes, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  ZeroBigInt,
  platformAddress,
  vaultManagerAddress,
  getBalanceAddress,
  priceReaderAddress,
  addressZero,
  defiedgeFactoryAddress,
} from "./constants";
import {
  VaultTypeEntity,
  VaultEntity,
  StrategyEntity,
  StrategyConfigEntity,
  LastFeeAMLEntity,
  VaultAPRsEntity,
  DefiEdgePoolsAndStrategiesEntity,
} from "../generated/schema";
import {
  VaultData,
  StrategyData,
  IchiQuickSwapMerklFarmData,
  IchiRetroMerklFarmData,
  DefiEdgeQuickSwapMerklFarmData,
  DefiEdgeFactoryData,
} from "../generated/templates";

import { PlatformABI as PlatformContract } from "../generated/PlatformData/PlatformABI";
import { VaultABI as VaultContract } from "../generated/templates/VaultData/VaultABI";
import {
  VaultConfigChanged as VaultConfigChangedEvent,
  VaultStatus as VaultStatusEvent,
  VaultProxyUpgraded as VaultProxyUpgradedEvent,
  StrategyProxyUpgraded as StrategyProxyUpgradedEvent,
  StrategyLogicConfigChanged as StrategyLogicConfigChangedEvent,
  FactoryABI as FactoryContract,
} from "../generated/templates/FactoryData/FactoryABI";
import { ERC20UpgradeableABI } from "../generated/templates/FactoryData/ERC20UpgradeableABI";
import { ERC20DQMFABI } from "../generated/templates/FactoryData/ERC20DQMFABI";
import { HyperVisorABI } from "../generated/templates/FactoryData/HyperVisorABI";
import { DefiEdgeManagerABI } from "../generated/templates/FactoryData/DefiEdgeManagerABI";
import { DefiEdgeFactoryABI } from "../generated/templates/FactoryData/DefiEdgeFactoryABI";
import { DefiEdgeStrategyABI } from "../generated/templates/FactoryData/DefiEdgeStrategyABI";
import { DefiEdgeQuickSwapMerklFarmDataABI } from "../generated/templates/FactoryData/DefiEdgeQuickSwapMerklFarmDataABI";
import { StrategyBaseABI as StrategyContract } from "../generated/templates/StrategyData/StrategyBaseABI";
import { LPStrategyBaseABI as _LPStrategyContract } from "../generated/templates/StrategyData/LPStrategyBaseABI";
import { VaultManagerABI as VaultManagerContract } from "../generated/templates/VaultManagerData/VaultManagerABI";
import { VaultAndStrategy as VaultAndStrategyEvent } from "../generated/templates/FactoryData/FactoryABI";
import { getBalanceABI as GetBalanceContract } from "../generated/templates/StrategyData/getBalanceABI";
import { PriceReaderABI as PriceReaderContract } from "../generated/templates/IchiQuickSwapMerklFarmData/PriceReaderABI";

export function handleVaultAndStrategy(event: VaultAndStrategyEvent): void {
  const vault = new VaultEntity(event.params.vault);
  const strategyEntity = new StrategyEntity(event.params.strategy);

  const vaultTypeEntity = VaultTypeEntity.load(
    event.params.vaultType
  ) as VaultTypeEntity;
  const strategyContract = StrategyContract.bind(event.params.strategy);
  const LPStrategyContract = _LPStrategyContract.bind(event.params.strategy);
  const vaultManagerContract = VaultManagerContract.bind(
    Address.fromString(vaultManagerAddress)
  );
  const _vaultInfo = vaultManagerContract.vaultInfo(event.params.vault);
  const vaultContract = VaultContract.bind(event.params.vault);
  const factoryContract = FactoryContract.bind(event.address);
  const priceReader = PriceReaderContract.bind(
    Address.fromString(priceReaderAddress)
  );

  const underlying = strategyContract.underlying();
  if (event.params.strategyId == "Ichi QuickSwap Merkl Farm") {
    IchiQuickSwapMerklFarmData.create(strategyContract.underlying());
    const lastFeeAMLEntity = new LastFeeAMLEntity(underlying);
    lastFeeAMLEntity.vault = event.params.vault;
    lastFeeAMLEntity.APRS = [];
    lastFeeAMLEntity.timestamps = [event.block.timestamp];
    lastFeeAMLEntity.save();
  }

  if (event.params.strategyId == "Ichi Retro Merkl Farm") {
    IchiRetroMerklFarmData.create(strategyContract.underlying());
    const lastFeeAMLEntity = new LastFeeAMLEntity(underlying);
    lastFeeAMLEntity.vault = event.params.vault;
    lastFeeAMLEntity.APRS = [];
    lastFeeAMLEntity.timestamps = [event.block.timestamp];
    lastFeeAMLEntity.save();
  }

  if (event.params.strategyId == "DefiEdge QuickSwap Merkl Farm") {
    const strategyContract = DefiEdgeStrategyABI.bind(event.params.strategy);
    DefiEdgeQuickSwapMerklFarmData.create(strategyContract.underlying());
    DefiEdgeFactoryData.create(Address.fromString(defiedgeFactoryAddress));
    const pool = strategyContract.pool();

    let defiEdgePoolsAndStrategies = DefiEdgePoolsAndStrategiesEntity.load(
      Address.fromString(defiedgeFactoryAddress)
    );
    if (!defiEdgePoolsAndStrategies) {
      defiEdgePoolsAndStrategies = new DefiEdgePoolsAndStrategiesEntity(
        Address.fromString(defiedgeFactoryAddress)
      );
      defiEdgePoolsAndStrategies.pools = [];
      defiEdgePoolsAndStrategies.strategies = [];
    }

    let _pools = defiEdgePoolsAndStrategies.pools;
    let _strategies = defiEdgePoolsAndStrategies.strategies;

    _pools.push(pool);
    _strategies.push(event.params.strategy);

    defiEdgePoolsAndStrategies.pools = _pools;
    defiEdgePoolsAndStrategies.strategies = _strategies;

    defiEdgePoolsAndStrategies.save();

    const lastFeeAMLEntity = new LastFeeAMLEntity(underlying);
    const underlyingContract =
      DefiEdgeQuickSwapMerklFarmDataABI.bind(underlying);
    const managerContract = DefiEdgeManagerABI.bind(
      underlyingContract.manager()
    );
    const factoryContract = DefiEdgeFactoryABI.bind(
      underlyingContract.factory()
    );
    const managerFee = managerContract.performanceFeeRate();
    const factoryFee = factoryContract.getProtocolPerformanceFeeRate(
      pool,
      event.params.strategy
    );
    lastFeeAMLEntity.fee = managerFee
      .plus(factoryFee)
      .div(BigInt.fromI32(100 * 10 ** 4)); //fee/100e6*100
    lastFeeAMLEntity.managerFee = managerFee;
    lastFeeAMLEntity.factoryFee = factoryFee;
    lastFeeAMLEntity.total_fee = managerFee.plus(factoryFee);
    lastFeeAMLEntity.vault = event.params.vault;
    lastFeeAMLEntity.APRS = [];
    lastFeeAMLEntity.timestamps = [event.block.timestamp];
    lastFeeAMLEntity.save();
  }

  if (event.params.strategyId.includes("Gamma")) {
    const lastFeeAMLEntity = new LastFeeAMLEntity(underlying);
    const underlyingContract = HyperVisorABI.bind(underlying);
    lastFeeAMLEntity.vault = event.params.vault;
    lastFeeAMLEntity.APRS = [];
    lastFeeAMLEntity.fee = BigInt.fromI32(100).div(
      BigInt.fromI32(underlyingContract.fee())
    );
    lastFeeAMLEntity.timestamps = [event.block.timestamp];
    lastFeeAMLEntity.save();
  }

  const vaultAPR24HEntity = new VaultAPRsEntity(event.params.vault);
  vaultAPR24HEntity.APRS = [];
  vaultAPR24HEntity.timestamps = [];
  vaultAPR24HEntity.save();

  VaultData.create(event.params.vault);
  StrategyData.create(event.params.strategy);

  //Calculate vault.AssetsPricesOnCreation//

  const _amounts: Array<BigInt> = [];
  for (let i = 0; i < _vaultInfo.value1.length; i++) {
    _amounts.push(ZeroBigInt);
  }

  const assetsPrices = priceReader.getAssetsPrice(_vaultInfo.value1, _amounts);
  /////

  vault.lastHardWork = ZeroBigInt;
  vault.totalSupply = ZeroBigInt;
  vault.apr = ZeroBigInt;
  vault.tvl = ZeroBigInt;
  vault.sharePrice = ZeroBigInt;
  vault.vaultUsersList = [];
  vault.strategy = event.params.strategy;
  vault.vaultType = event.params.vaultType;
  vault.strategyId = event.params.strategyId;
  vault.name = event.params.name;
  vault.symbol = event.params.symbol;
  vault.color = vaultTypeEntity.color;
  vault.colorBackground = vaultTypeEntity.colorBackground;
  vault.deployAllowed = vaultTypeEntity.deployAllowed;
  vault.upgradeAllowed = vaultTypeEntity.upgradeAllowed;
  vault.version = vaultContract.VERSION();
  vault.vaultBuildingPrice = vaultTypeEntity.vaultBuildingPrice;
  vault.underlying = underlying;
  vault.strategySpecific = strategyContract.getSpecificName().value0;
  vault.assetsProportions = strategyContract.getAssetsProportions();
  vault.strategyDescription = strategyContract.description();
  vault.strategyAssets = changetype<Bytes[]>(_vaultInfo.value1);
  vault.assetsWithApr = changetype<Bytes[]>(_vaultInfo.value3);
  vault.assetsAprs = _vaultInfo.value4;
  vault.vaultStatus = factoryContract.vaultStatus(event.params.vault);
  vault.hardWorkOnDeposit = true;
  vault.created = event.block.timestamp;
  vault.NFTtokenID = vaultManagerContract
    .totalSupply()
    .minus(BigInt.fromI32(1));
  vault.AssetsPricesOnCreation = assetsPrices.value2;
  vault.lifeTimeAPR = ZeroBigInt;
  if (event.block.number > BigInt.fromI32(53088320)) {
    const getBalanceContract = GetBalanceContract.bind(
      Address.fromString(getBalanceAddress)
    );
    vault.gasReserve = getBalanceContract.getBalance(event.params.vault);
  }

  vault.save();

  //STRATEGY ENTITY
  let strategies = factoryContract.strategies();
  let index = strategies.value0.indexOf(event.params.strategyId);

  const colorBytes = strategies.value6[index];
  const color = changetype<Bytes>(colorBytes.slice(0, 3));
  const colorBackground = changetype<Bytes>(colorBytes.slice(3, 6));

  strategyEntity.strategyId = event.params.strategyId;
  strategyEntity.version = strategyContract.VERSION();
  strategyEntity.tokenId = strategies.value4[index];
  //strategyEntity.shortName =
  strategyEntity.color = color;
  strategyEntity.colorBackground = colorBackground;
  if (strategyContract.supportsInterface(Bytes.fromHexString("0x07b0b3aa"))) {
    strategyEntity.pool = LPStrategyContract.pool();
  }

  //UnderlyingSymbol

  if (underlying != Address.fromHexString(addressZero)) {
    if (event.params.strategyId == "DefiEdge QuickSwap Merkl Farm") {
      const underlyingContract = ERC20DQMFABI.bind(underlying);
      strategyEntity.underlyingSymbol = underlyingContract.symbol().toString();
    } else {
      const underlyingContract = ERC20UpgradeableABI.bind(underlying);
      strategyEntity.underlyingSymbol = underlyingContract.symbol();
    }
  }

  strategyEntity.save();

  //STRATEGY CONFIG ENTITY
  let stategyConfigEntity: StrategyConfigEntity;
  if (!StrategyConfigEntity.load(event.params.strategyId)) {
    stategyConfigEntity = new StrategyConfigEntity(event.params.strategyId);
  } else {
    stategyConfigEntity = StrategyConfigEntity.load(
      event.params.strategyId
    ) as StrategyConfigEntity;
  }
  stategyConfigEntity.version = strategyContract.VERSION();
  stategyConfigEntity.save();
}

export function handleVaultConfigChanged(event: VaultConfigChangedEvent): void {
  const vaultTypeEntity = new VaultTypeEntity(event.params.type_);

  const platformContract = PlatformContract.bind(
    Address.fromString(platformAddress)
  );
  const platformData = platformContract.getData();

  const colorBytes = platformData.value4;
  const vaultTypes = platformData.value3;

  const index = vaultTypes.indexOf(event.params.type_);
  const _colorBytes = colorBytes[index];
  const color = changetype<Bytes>(_colorBytes.slice(0, 3));
  const colorBackground = changetype<Bytes>(_colorBytes.slice(3, 6));

  const vaultContract = VaultContract.bind(event.params.implementation);

  vaultTypeEntity.version = vaultContract.VERSION();
  vaultTypeEntity.color = color;
  vaultTypeEntity.colorBackground = colorBackground;
  vaultTypeEntity.deployAllowed = event.params.deployAllowed;
  vaultTypeEntity.upgradeAllowed = event.params.upgradeAllowed;
  vaultTypeEntity.vaultBuildingPrice = platformData.value5[index];

  vaultTypeEntity.save();
}

export function handleVaultStatus(event: VaultStatusEvent): void {
  const vault = VaultEntity.load(event.params.vault) as VaultEntity;
  vault.vaultStatus = event.params.newStatus;
  vault.save();
}

export function handleVaultProxyUpgraded(event: VaultProxyUpgradedEvent): void {
  const vault = VaultEntity.load(event.params.proxy) as VaultEntity;
  const vaultContract = VaultContract.bind(event.params.proxy);
  vault.version = vaultContract.VERSION();
  vault.save();
}

export function handleStrategyProxyUpgraded(
  event: StrategyProxyUpgradedEvent
): void {
  const strategy = StrategyEntity.load(event.params.proxy) as StrategyEntity;
  const strategyContract = StrategyContract.bind(event.params.proxy);
  strategy.version = strategyContract.VERSION();
  strategy.save();
}

export function handleStrategyLogicConfigChanged(
  event: StrategyLogicConfigChangedEvent
): void {
  let stategyConfigEntity: StrategyConfigEntity;
  if (!StrategyConfigEntity.load(event.params.id)) {
    stategyConfigEntity = new StrategyConfigEntity(event.params.id);
  } else {
    stategyConfigEntity = StrategyConfigEntity.load(
      event.params.id
    ) as StrategyConfigEntity;
  }
  const strategyContract = StrategyContract.bind(event.params.implementation);
  stategyConfigEntity.version = strategyContract.VERSION();
  stategyConfigEntity.save();
}
