import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";

import { MetaVaultData, WrappedMetaVaultData } from "../generated/templates";

import {
  MetaVaultEntity,
  MetaVaultFactoryEntity,
  WrappedMetaVaultEntity,
} from "../generated/schema";

import { MetaVaultABI as MetaVaultContract } from "../generated/templates/MetaVaultData/MetaVaultABI";
import { WrappedMetaVaultABI as WrappedMetaVaultContract } from "../generated/templates/WrappedMetaVaultData/WrappedMetaVaultABI";

import {
  NewMetaVault as NewMetaVaultEvent,
  NewWrappedMetaVault as NewWrappedMetaVaultEvent,
} from "../generated/templates/MetaVaultFactoryData/MetaVaultFactoryABI";

import { metaVaultFactoryAddress, ZeroBigInt } from "./utils/constants";

export function handleNewMetaVault(event: NewMetaVaultEvent): void {
  const metaVaultFactory = MetaVaultFactoryEntity.load(
    Address.fromString(metaVaultFactoryAddress)
  ) as MetaVaultFactoryEntity;

  const metaVaults = metaVaultFactory.metaVaults;

  metaVaults.push(event.params.metaVault);

  metaVaultFactory.metaVaults = metaVaults;

  metaVaultFactory.save();

  const metaVault = new MetaVaultEntity(event.params.metaVault);

  MetaVaultData.create(event.params.metaVault);

  const metaVaultContract = MetaVaultContract.bind(event.params.metaVault);

  const name = metaVaultContract.name();
  const symbol = metaVaultContract.symbol();
  const decimals = metaVaultContract.decimals();
  const assets = metaVaultContract.assets();

  metaVault.name = name;
  metaVault.symbol = symbol;
  metaVault.decimals = BigInt.fromI32(decimals).toString();
  metaVault.assets = assets.map<Bytes>((address) => changetype<Bytes>(address));
  metaVault.deposited = ZeroBigInt;
  metaVault.vaults = [];

  metaVault.save();
}

export function handleNewWrappedMetaVault(
  event: NewWrappedMetaVaultEvent
): void {
  const metaVaultFactory = MetaVaultFactoryEntity.load(
    Address.fromString(metaVaultFactoryAddress)
  ) as MetaVaultFactoryEntity;

  const wrappedMetaVaults = metaVaultFactory.wrappedMetaVaults;

  wrappedMetaVaults.push(event.params.wrappedMetaVault);

  metaVaultFactory.wrappedMetaVaults = wrappedMetaVaults;

  metaVaultFactory.save();

  const wrappedMetaVault = new WrappedMetaVaultEntity(
    event.params.wrappedMetaVault
  );

  WrappedMetaVaultData.create(event.params.wrappedMetaVault);

  const wrappedMetaVaultContract = WrappedMetaVaultContract.bind(
    event.params.wrappedMetaVault
  );

  const name = wrappedMetaVaultContract.name();
  const symbol = wrappedMetaVaultContract.symbol();
  const decimals = wrappedMetaVaultContract.decimals();
  const asset = wrappedMetaVaultContract.asset();

  wrappedMetaVault.name = name;
  wrappedMetaVault.symbol = symbol;
  wrappedMetaVault.decimals = BigInt.fromI32(decimals).toString();
  wrappedMetaVault.asset = asset;
  wrappedMetaVault.deposited = ZeroBigInt;

  wrappedMetaVault.save();
}
