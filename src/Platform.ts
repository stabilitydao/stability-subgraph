import { Address } from "@graphprotocol/graph-ts";
import {
  AMMAdapterEntity,
  PlatformEntity,
  MetaVaultFactoryEntity,
} from "../generated/schema";
import {
  SwapperData,
  FactoryData,
  MetaVaultFactoryData,
} from "../generated/templates";

import {
  Addresses as AddressesEvent,
  ContractInitialized as ContractInitializedEvent,
  PlatformVersion as PlatformVersionEvent,
  AddDexAggregator as AddDexAggregatorEvent,
  PlatformABI as PlatformContract,
  NewAmmAdapter as NewAmmAdapterEvent,
} from "../generated/PlatformData/PlatformABI";

import { metaVaultFactoryAddress, platformAddress } from "./utils/constants";

export function handleAddresses(event: AddressesEvent): void {
  const platform = PlatformEntity.load(event.address) as PlatformEntity;
  const platformContract = PlatformContract.bind(event.address);
  const result = platformContract.getData();
  SwapperData.create(event.params.swapper_);
  FactoryData.create(event.params.factory_);

  platform.multisig = event.params.multisig_;
  platform.factory = event.params.factory_;
  platform.vaultManager = event.params.vaultManager_;
  platform.strategyLogic = event.params.strategyLogic_;
  platform.buildingPermitToken = event.params.buildingPermitToken_;
  platform.zap = event.params.zap;
  platform.bridge = event.params.bridge;
  platform.swapper = event.params.swapper_;
  platform.buildingPayPerVaultToken = result.value0[4];
  platform.governance = result.value0[5];
  platform.metaVaultFactory = Address.fromString(metaVaultFactoryAddress);

  const metaVaultFactory = new MetaVaultFactoryEntity(
    Address.fromString(metaVaultFactoryAddress)
  );

  MetaVaultFactoryData.create(Address.fromString(metaVaultFactoryAddress));

  metaVaultFactory.metaVaults = [];
  metaVaultFactory.wrappedMetaVaults = [];

  metaVaultFactory.save();
  platform.save();
}

export function handleContractInitialized(
  event: ContractInitializedEvent
): void {
  const platform = new PlatformEntity(event.params.platform);
  platform.save();
}

export function handlePlatformVersion(event: PlatformVersionEvent): void {
  const platform = PlatformEntity.load(event.address) as PlatformEntity;
  platform.version = event.params.version;
  platform.save();
}

export function handleAddDexAggregator(event: AddDexAggregatorEvent): void {
  const platform = PlatformEntity.load(
    Address.fromString(platformAddress)
  ) as PlatformEntity;
  let dexAggreagators = platform.dexAggreagators;
  if (!dexAggreagators) {
    dexAggreagators = [];
  }
  dexAggreagators.push(event.params.router);
  platform.dexAggreagators = dexAggreagators;
  platform.save();
}

export function handleNewAmmAdapter(event: NewAmmAdapterEvent): void {
  const adapter = new AMMAdapterEntity(event.params.proxy);

  adapter.name = event.params.id;

  adapter.save();
}
