import { Bytes, log } from "@graphprotocol/graph-ts";
import {
  WrappedMetaVaultEntity,
  UserMetaVaultEntity,
  MetaVaultEntity,
  UserMetaEntity,
} from "../generated/schema";
import {
  MetaVaultABI as MetaVaultContract,
  Transfer as TransferEvent,
} from "../generated/templates/MetaVaultData/MetaVaultABI";

import {
  Deposit as DepositEvent,
  Withdraw as WithdrawEvent,
  WrappedMetaVaultABI as WrappedMetaVaultContract,
} from "../generated/templates/WrappedMetaVaultData/WrappedMetaVaultABI";

import { OneBigInt, ZeroBigInt } from "./utils/constants";

export function handleDeposit(event: DepositEvent): void {
  const wrappedMetaVault = WrappedMetaVaultEntity.load(
    event.address
  ) as WrappedMetaVaultEntity;

  const wrappedMetaVaultContract = WrappedMetaVaultContract.bind(event.address);
  const metaVaultAddress = wrappedMetaVaultContract.metaVault();
  const metaVaultContract = MetaVaultContract.bind(metaVaultAddress);

  wrappedMetaVault.deposited = wrappedMetaVault.deposited.plus(
    event.params.assets
  );
  wrappedMetaVault.save();

  const metaVault = MetaVaultEntity.load(metaVaultAddress);
  if (!metaVault || metaVault.type != "MetaVault") return;

  const userId = metaVaultAddress
    .toHexString()
    .concat(":")
    .concat(event.params.sender.toHexString());

  let userMetaVault = UserMetaVaultEntity.load(userId);

  if (!userMetaVault) {
    metaVault.users = metaVault.users.plus(OneBigInt);
    metaVault.save();

    const userEntity = new UserMetaEntity(
      metaVaultAddress
        .toHexString()
        .concat(":")
        .concat(metaVault.users.toHexString())
    );
    userEntity.address = changetype<Bytes>(event.params.sender);
    userEntity.save();

    userMetaVault = new UserMetaVaultEntity(userId);
    userMetaVault.metaVault = metaVault.id;
    userMetaVault.balance = ZeroBigInt;
    userMetaVault.deposited = ZeroBigInt;
    userMetaVault.rewardsEarned = ZeroBigInt;
  }

  const wrappedResult = wrappedMetaVaultContract.try_balanceOf(
    event.params.sender
  );
  if (wrappedResult.reverted) {
    log.warning("Wrapped balanceOf reverted (deposit): {}", [
      event.params.sender.toHexString(),
    ]);
  }

  const metaResult = metaVaultContract.try_balanceOf(event.params.sender);
  if (metaResult.reverted) {
    log.warning("MetaVault balanceOf reverted (deposit): {}", [
      event.params.sender.toHexString(),
    ]);
  }

  const wrappedBalance = wrappedResult.reverted
    ? ZeroBigInt
    : wrappedResult.value;

  const metaBalance = metaResult.reverted ? ZeroBigInt : metaResult.value;

  const userBalance = wrappedBalance.plus(metaBalance);

  userMetaVault.balance = userBalance;
  userMetaVault.deposited = userBalance.times(metaVault.sharePrice);
  userMetaVault.save();
}

export function handleWithdraw(event: WithdrawEvent): void {
  const wrappedMetaVault = WrappedMetaVaultEntity.load(
    event.address
  ) as WrappedMetaVaultEntity;

  const wrappedMetaVaultContract = WrappedMetaVaultContract.bind(event.address);
  const metaVaultAddress = wrappedMetaVaultContract.metaVault();
  const metaVaultContract = MetaVaultContract.bind(metaVaultAddress);

  wrappedMetaVault.deposited = wrappedMetaVault.deposited.ge(
    event.params.assets
  )
    ? wrappedMetaVault.deposited.minus(event.params.assets)
    : ZeroBigInt;

  wrappedMetaVault.save();

  const metaVault = MetaVaultEntity.load(metaVaultAddress);
  if (!metaVault || metaVault.type != "MetaVault") return;

  const userId = metaVaultAddress
    .toHexString()
    .concat(":")
    .concat(event.params.sender.toHexString());

  let userMetaVault = UserMetaVaultEntity.load(userId);
  if (!userMetaVault) {
    userMetaVault = new UserMetaVaultEntity(userId);
    userMetaVault.metaVault = metaVault.id;
    userMetaVault.balance = ZeroBigInt;
    userMetaVault.deposited = ZeroBigInt;
    userMetaVault.rewardsEarned = ZeroBigInt;
  }

  const wrappedResult = wrappedMetaVaultContract.try_balanceOf(
    event.params.sender
  );
  if (wrappedResult.reverted) {
    log.warning("Wrapped balanceOf reverted (withdraw): {}", [
      event.params.sender.toHexString(),
    ]);
  }

  const metaResult = metaVaultContract.try_balanceOf(event.params.sender);
  if (metaResult.reverted) {
    log.warning("MetaVault balanceOf reverted (withdraw): {}", [
      event.params.sender.toHexString(),
    ]);
  }

  const wrappedBalance = wrappedResult.reverted
    ? ZeroBigInt
    : wrappedResult.value;

  const metaBalance = metaResult.reverted ? ZeroBigInt : metaResult.value;

  const userBalance = wrappedBalance.plus(metaBalance);

  userMetaVault.balance = userBalance;
  userMetaVault.deposited = userBalance.times(metaVault.sharePrice);
  userMetaVault.save();
}
export function handleTransfer(event: TransferEvent): void {
  const wrappedMetaVaultContract = WrappedMetaVaultContract.bind(event.address);
  const metaVaultAddress = wrappedMetaVaultContract.metaVault();
  const metaVaultContract = MetaVaultContract.bind(metaVaultAddress);

  const metaVault = MetaVaultEntity.load(metaVaultAddress);
  if (!metaVault || metaVault.type != "MetaVault") return;

  const spenderId = metaVaultAddress
    .toHexString()
    .concat(":")
    .concat(event.params.from.toHexString());

  const receiverId = metaVaultAddress
    .toHexString()
    .concat(":")
    .concat(event.params.to.toHexString());

  let spender = UserMetaVaultEntity.load(spenderId);
  let receiver = UserMetaVaultEntity.load(receiverId);

  if (!spender) {
    metaVault.users = metaVault.users.plus(OneBigInt);
    metaVault.save();

    const user = new UserMetaEntity(
      metaVaultAddress
        .toHexString()
        .concat(":")
        .concat(metaVault.users.toHexString())
    );
    user.address = changetype<Bytes>(event.params.from);
    user.save();

    spender = new UserMetaVaultEntity(spenderId);
    spender.metaVault = metaVault.id;
    spender.balance = ZeroBigInt;
    spender.deposited = ZeroBigInt;
    spender.rewardsEarned = ZeroBigInt;
  }

  if (!receiver) {
    metaVault.users = metaVault.users.plus(OneBigInt);
    metaVault.save();

    const user = new UserMetaEntity(
      metaVaultAddress
        .toHexString()
        .concat(":")
        .concat(metaVault.users.toHexString())
    );
    user.address = changetype<Bytes>(event.params.to);
    user.save();

    receiver = new UserMetaVaultEntity(receiverId);
    receiver.metaVault = metaVault.id;
    receiver.balance = ZeroBigInt;
    receiver.deposited = ZeroBigInt;
    receiver.rewardsEarned = ZeroBigInt;
  }

  const wFrom = wrappedMetaVaultContract.try_balanceOf(event.params.from);
  const wTo = wrappedMetaVaultContract.try_balanceOf(event.params.to);
  const mFrom = metaVaultContract.try_balanceOf(event.params.from);
  const mTo = metaVaultContract.try_balanceOf(event.params.to);

  if (wFrom.reverted)
    log.warning("Wrapped balanceOf reverted (from): {}", [
      event.params.from.toHexString(),
    ]);
  if (wTo.reverted)
    log.warning("Wrapped balanceOf reverted (to): {}", [
      event.params.to.toHexString(),
    ]);
  if (mFrom.reverted)
    log.warning("MetaVault balanceOf reverted (from): {}", [
      event.params.from.toHexString(),
    ]);
  if (mTo.reverted)
    log.warning("MetaVault balanceOf reverted (to): {}", [
      event.params.to.toHexString(),
    ]);

  const spenderBalance = (wFrom.reverted ? ZeroBigInt : wFrom.value).plus(
    mFrom.reverted ? ZeroBigInt : mFrom.value
  );

  const receiverBalance = (wTo.reverted ? ZeroBigInt : wTo.value).plus(
    mTo.reverted ? ZeroBigInt : mTo.value
  );

  spender.balance = spenderBalance;
  receiver.balance = receiverBalance;

  spender.deposited = spenderBalance.times(metaVault.sharePrice);
  receiver.deposited = receiverBalance.times(metaVault.sharePrice);

  spender.save();
  receiver.save();
}
