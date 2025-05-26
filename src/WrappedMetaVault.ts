import { WrappedMetaVaultEntity } from "../generated/schema";

import {
  Deposit as DepositEvent,
  Withdraw as WithdrawEvent,
} from "../generated/templates/WrappedMetaVaultData/WrappedMetaVaultABI";

import { ZeroBigInt } from "./utils/constants";

export function handleDeposit(event: DepositEvent): void {
  const wrappedMetaVault = WrappedMetaVaultEntity.load(
    event.address
  ) as WrappedMetaVaultEntity;

  const prevDeposited = wrappedMetaVault.deposited;

  wrappedMetaVault.deposited = prevDeposited.plus(event.params.assets);

  wrappedMetaVault.save();
}

export function handleWithdraw(event: WithdrawEvent): void {
  const wrappedMetaVault = WrappedMetaVaultEntity.load(
    event.address
  ) as WrappedMetaVaultEntity;

  const prevDeposited = wrappedMetaVault.deposited;
  const assets = event.params.assets;

  wrappedMetaVault.deposited = prevDeposited.ge(assets)
    ? prevDeposited.minus(assets)
    : ZeroBigInt;

  wrappedMetaVault.save();
}
