import { BigInt, Bytes } from "@graphprotocol/graph-ts";

import { MetaVaultEntity } from "../generated/schema";

import { MetaVaultABI as MetaVaultContract } from "../generated/templates/MetaVaultData/MetaVaultABI";

import {
  APR as APREvent,
  DepositAssets as DepositAssetsEvent,
  WithdrawAssets as WithdrawAssetsEvent,
  VaultName as VaultNameEvent,
  VaultSymbol as VaultSymbolEvent,
  AddVault as AddVaultEvent,
} from "../generated/templates/MetaVaultData/MetaVaultABI";

import { ZeroBigInt } from "./utils/constants";

export function handleAPR(event: APREvent): void {
  const metaVault = MetaVaultEntity.load(event.address) as MetaVaultEntity;

  metaVault.APR = event.params.apr;
  metaVault.sharePrice = event.params.sharePrice;
  metaVault.tvl = event.params.tvl;

  metaVault.save();
}

export function handleDepositAssets(event: DepositAssetsEvent): void {
  const metaVault = MetaVaultEntity.load(event.address) as MetaVaultEntity;

  const amounts = event.params.amounts;
  const prevDeposited = metaVault.deposited || [];

  const newDeposited: BigInt[] = [];

  for (let i = 0; i < amounts.length; i++) {
    const previous = i < prevDeposited.length ? prevDeposited[i] : ZeroBigInt;
    newDeposited.push(previous.plus(amounts[i]));
  }

  metaVault.deposited = newDeposited;
  metaVault.save();
}

export function handleWithdrawAssets(event: WithdrawAssetsEvent): void {
  const metaVault = MetaVaultEntity.load(event.address) as MetaVaultEntity;

  const amountsOut = event.params.amountsOut;

  const prevWithdrawn = metaVault.withdrawn;
  const prevDeposited = metaVault.deposited;

  const newWithdrawn: BigInt[] = [];
  const newDeposited: BigInt[] = [];

  for (let i = 0; i < amountsOut.length; i++) {
    const withdrawnPrev =
      i < prevWithdrawn.length ? prevWithdrawn[i] : ZeroBigInt;
    const depositedPrev =
      i < prevDeposited.length ? prevDeposited[i] : ZeroBigInt;

    newWithdrawn.push(withdrawnPrev.plus(amountsOut[i]));

    const newDeposit = depositedPrev.ge(amountsOut[i])
      ? depositedPrev.minus(amountsOut[i])
      : ZeroBigInt;

    newDeposited.push(newDeposit);
  }

  metaVault.withdrawn = newWithdrawn;
  metaVault.deposited = newDeposited;

  metaVault.save();
}

export function handleVaultName(event: VaultNameEvent): void {
  const metaVault = MetaVaultEntity.load(event.address) as MetaVaultEntity;

  metaVault.name = event.params.newName;

  metaVault.save();
}

export function handleVaultSymbol(event: VaultSymbolEvent): void {
  const metaVault = MetaVaultEntity.load(event.address) as MetaVaultEntity;

  metaVault.symbol = event.params.newSymbol;

  metaVault.save();
}

export function handleAddVault(event: AddVaultEvent): void {
  const metaVault = MetaVaultEntity.load(event.address) as MetaVaultEntity;

  const metaVaultContract = MetaVaultContract.bind(event.address);

  const assets = metaVaultContract.assets();

  const vaults = metaVault.vaults;

  vaults.push(event.params.vault);

  metaVault.vaults = vaults;

  metaVault.assets = assets.map<Bytes>((address) => changetype<Bytes>(address));

  metaVault.save();
}
