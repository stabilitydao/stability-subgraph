import { BigInt, Bytes, BigDecimal } from "@graphprotocol/graph-ts";

import {
  MetaVaultEntity,
  UserMetaVaultEntity,
  UserMetaEntity,
  MetaVaultHistoryEntity,
} from "../generated/schema";

import {
  MetaVaultABI as MetaVaultContract,
  APR as APREvent,
  DepositAssets as DepositAssetsEvent,
  WithdrawAssets as WithdrawAssetsEvent,
  VaultName as VaultNameEvent,
  VaultSymbol as VaultSymbolEvent,
  AddVault as AddVaultEvent,
  Transfer as TransferEvent,
} from "../generated/templates/MetaVaultData/MetaVaultABI";

import { ZeroBigInt, OneBigInt } from "./utils/constants";

export function handleAPR(event: APREvent): void {
  let metaVault = MetaVaultEntity.load(event.address) as MetaVaultEntity;

  const vaultAddress = event.address;

  const lastAPRTimestamp = metaVault.lastAPRTimestamp;

  metaVault.APR = event.params.apr;
  metaVault.sharePrice = event.params.sharePrice;
  metaVault.tvl = event.params.tvl;
  metaVault.lastAPRTimestamp = event.block.timestamp;

  metaVault.save();

  //===========MetaVaultHistory===========//
  let metaVaultHistoryEntity = new MetaVaultHistoryEntity(
    event.transaction.hash
      .concatI32(event.transaction.nonce.toI32())
      .toHexString()
      .concat(":")
      .concat(event.address.toHexString())
  );

  metaVaultHistoryEntity.address = event.address;
  metaVaultHistoryEntity.metaVault = event.address;
  metaVaultHistoryEntity.APR = event.params.apr;
  metaVaultHistoryEntity.sharePrice = event.params.sharePrice;
  metaVaultHistoryEntity.tvl = event.params.tvl;
  metaVaultHistoryEntity.timestamp = event.block.timestamp;

  metaVaultHistoryEntity.save();
  //===========Earn===========//
  if (metaVault.type == "MetaVault") {
    const usersCount = metaVault.users;
    const currentTimestamp = event.block.timestamp;
    const apr = metaVault.APR;
    const lastTimestamp = lastAPRTimestamp;

    const secondsInDay = 86400;
    const daysSinceLastAPR = currentTimestamp
      .minus(lastTimestamp)
      .div(BigInt.fromI32(secondsInDay));

    if (daysSinceLastAPR.equals(ZeroBigInt)) {
      return;
    }

    for (let i = 1; i <= usersCount.toI32(); i++) {
      const userID = vaultAddress
        .toHexString()
        .concat(":")
        .concat(BigInt.fromI32(i).toHexString());

      const currentUser = UserMetaEntity.load(userID) as UserMetaEntity;

      const userAddressString = vaultAddress
        .toHexString()
        .concat(":")
        .concat(currentUser.address.toHexString());

      let userVault = UserMetaVaultEntity.load(
        userAddressString
      ) as UserMetaVaultEntity;

      userVault.metaVault = vaultAddress;

      if (userVault.deposited == ZeroBigInt) {
        continue;
      }

      const aprDecimal = apr
        .toBigDecimal()
        .div(BigDecimal.fromString("100000"));
      const daysDecimal = daysSinceLastAPR.toBigDecimal();
      const depositedDecimal = userVault.deposited.toBigDecimal();

      const earned = depositedDecimal
        .times(aprDecimal)
        .times(daysDecimal)
        .div(BigDecimal.fromString("365"));

      const earnedBigInt = BigInt.fromString(earned.truncate(0).toString());

      userVault.rewardsEarned = userVault.rewardsEarned.plus(earnedBigInt);
      userVault.save();
    }
  }
}

export function handleDepositAssets(event: DepositAssetsEvent): void {
  let metaVault = MetaVaultEntity.load(event.address) as MetaVaultEntity;
  const metaVaultContract = MetaVaultContract.bind(event.address);

  const amounts = event.params.amounts;

  let deposited = metaVault.deposited;

  for (let i = 0; i < amounts.length; i++) {
    deposited = deposited.plus(amounts[i]);
  }

  metaVault.deposited = deposited;
  metaVault.save();

  // ==========MetaVaultHistory===========//
  let metaVaultHistoryEntity = new MetaVaultHistoryEntity(
    event.transaction.hash
      .concatI32(event.transaction.nonce.toI32())
      .toHexString()
      .concat(":")
      .concat(event.address.toHexString())
  );

  metaVaultHistoryEntity.address = event.address;
  metaVaultHistoryEntity.metaVault = event.address;
  metaVaultHistoryEntity.APR = metaVault.APR;
  metaVaultHistoryEntity.sharePrice = metaVault.sharePrice;
  metaVaultHistoryEntity.tvl = metaVault.tvl;
  metaVaultHistoryEntity.timestamp = event.block.timestamp;

  metaVaultHistoryEntity.save();
  //===========UserMetaVaultEntity + UserMetaEntity===========//
  if (metaVault.type == "MetaVault") {
    const _MetaVaultUserId = event.address
      .toHexString()
      .concat(":")
      .concat(event.params.account.toHexString());

    let userMetaVault = UserMetaVaultEntity.load(_MetaVaultUserId);

    let usersCount = metaVault.users;
    const metaVaultAddress = event.address.toHexString();
    const account = changetype<Bytes>(event.params.account);

    if (!userMetaVault) {
      let currentUsersCount = usersCount.plus(OneBigInt);

      metaVault.users = currentUsersCount;
      metaVault.save();

      const userID = metaVaultAddress
        .concat(":")
        .concat(currentUsersCount.toHexString());

      let userEntity = new UserMetaEntity(userID);
      userEntity.address = account;

      userEntity.save();

      userMetaVault = new UserMetaVaultEntity(_MetaVaultUserId);
      userMetaVault.metaVault = event.address;
      userMetaVault.balance = ZeroBigInt;
      userMetaVault.deposited = ZeroBigInt;
      userMetaVault.rewardsEarned = ZeroBigInt;
    }

    const userBalance = metaVaultContract.balanceOf(event.params.account);

    userMetaVault.balance = userBalance;

    userMetaVault.deposited = userBalance.times(metaVault.sharePrice);

    userMetaVault.save();
  }
}

export function handleWithdrawAssets(event: WithdrawAssetsEvent): void {
  let metaVault = MetaVaultEntity.load(event.address) as MetaVaultEntity;
  const metaVaultContract = MetaVaultContract.bind(event.address);

  const amountsOut = event.params.amountsOut;

  let deposited = metaVault.deposited;

  for (let i = 0; i < amountsOut.length; i++) {
    deposited = deposited.minus(amountsOut[i]);
  }

  metaVault.deposited = deposited;

  metaVault.save();

  // ==========MetaVaultHistory===========//
  let metaVaultHistoryEntity = new MetaVaultHistoryEntity(
    event.transaction.hash
      .concatI32(event.transaction.nonce.toI32())
      .toHexString()
      .concat(":")
      .concat(event.address.toHexString())
  );

  metaVaultHistoryEntity.address = event.address;
  metaVaultHistoryEntity.metaVault = event.address;
  metaVaultHistoryEntity.APR = metaVault.APR;
  metaVaultHistoryEntity.sharePrice = metaVault.sharePrice;
  metaVaultHistoryEntity.tvl = metaVault.tvl;
  metaVaultHistoryEntity.timestamp = event.block.timestamp;

  metaVaultHistoryEntity.save();
  //===========UserMetaVaultEntity===========//
  if (metaVault.type == "MetaVault") {
    const _MetaVaultUserId = event.address
      .toHexString()
      .concat(":")
      .concat(event.params.sender.toHexString());

    let userMetaVault = UserMetaVaultEntity.load(
      _MetaVaultUserId
    ) as UserMetaVaultEntity;

    if (userMetaVault === null) {
      userMetaVault = new UserMetaVaultEntity(_MetaVaultUserId);
      userMetaVault.metaVault = event.address;
      userMetaVault.balance = ZeroBigInt;
      userMetaVault.deposited = ZeroBigInt;
      userMetaVault.rewardsEarned = ZeroBigInt;
    }

    const userBalance = metaVaultContract.balanceOf(event.params.sender);

    userMetaVault.balance = userBalance;

    userMetaVault.deposited = userBalance.times(metaVault.sharePrice);

    userMetaVault.save();
  }
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

export function handleTransfer(event: TransferEvent): void {
  const metaVaultContract = MetaVaultContract.bind(event.address);

  const spenderUserId = event.address
    .toHexString()
    .concat(":")
    .concat(event.params.from.toHexString());

  const receiverUserId = event.address
    .toHexString()
    .concat(":")
    .concat(event.params.to.toHexString());

  let spenderUser = UserMetaVaultEntity.load(spenderUserId);
  let receiverUser = UserMetaVaultEntity.load(receiverUserId);

  if (spenderUser === null) {
    spenderUser = new UserMetaVaultEntity(spenderUserId);
    spenderUser.metaVault = event.address;
    spenderUser.balance = ZeroBigInt;
    spenderUser.deposited = ZeroBigInt;
    spenderUser.rewardsEarned = ZeroBigInt;
  }

  if (receiverUser === null) {
    receiverUser = new UserMetaVaultEntity(receiverUserId);
    receiverUser.metaVault = event.address;
    receiverUser.balance = ZeroBigInt;
    receiverUser.deposited = ZeroBigInt;
    receiverUser.rewardsEarned = ZeroBigInt;
  }

  const spenderBalance = metaVaultContract.balanceOf(event.params.from);
  const receiverBalance = metaVaultContract.balanceOf(event.params.to);

  spenderUser.balance = spenderBalance;
  receiverUser.balance = receiverBalance;

  spenderUser.save();
  receiverUser.save();
}
