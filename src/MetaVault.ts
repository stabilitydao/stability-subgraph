import {
  BigInt,
  Bytes,
  BigDecimal,
  Address,
  log,
} from "@graphprotocol/graph-ts";

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
  RemoveVault as RemoveVaultEvent,
} from "../generated/templates/MetaVaultData/MetaVaultABI";

import { WrappedMetaVaultABI as WrappedMetaVaultContract } from "../generated/templates/WrappedMetaVaultData/WrappedMetaVaultABI";

import { ZeroBigInt, OneBigInt } from "./utils/constants";

export function handleAPR(event: APREvent): void {
  let metaVault = MetaVaultEntity.load(event.address) as MetaVaultEntity;

  const vaultAddress = event.address;

  const lastAPRTimestamp = metaVault.lastAPRTimestamp;

  const currentTimestamp = event.block.timestamp;
  const secondsInDay = 86400;
  const daysSinceLastAPR = currentTimestamp
    .minus(lastAPRTimestamp)
    .div(BigInt.fromI32(secondsInDay));

  metaVault.APR = event.params.apr;
  metaVault.sharePrice = event.params.sharePrice;
  metaVault.tvl = event.params.tvl;

  if (daysSinceLastAPR.gt(ZeroBigInt)) {
    metaVault.lastAPRTimestamp = currentTimestamp;
  }

  metaVault.save();

  //===========MetaVaultHistory===========//
  let metaVaultHistoryEntity = new MetaVaultHistoryEntity(
    event.transaction.hash
      .concatI32(event.transaction.nonce.toI32())
      .toHexString()
      .concat(":")
      .concat(event.address.toHexString())
  );

  metaVaultHistoryEntity.timestamp = event.block.timestamp;
  metaVaultHistoryEntity.address = event.address;
  metaVaultHistoryEntity.metaVault = event.address;
  metaVaultHistoryEntity.APR = event.params.apr;
  metaVaultHistoryEntity.sharePrice = event.params.sharePrice;
  metaVaultHistoryEntity.tvl = event.params.tvl;

  metaVaultHistoryEntity.save();
  //===========Earn===========//
  if (metaVault.type == "MetaVault") {
    const usersCount = metaVault.users;
    const apr = metaVault.APR;

    if (daysSinceLastAPR.equals(ZeroBigInt)) return;

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

  //===========UserMetaVaultEntity===========//
  if (metaVault.type != "MetaVault") return;

  const userId = event.address
    .toHexString()
    .concat(":")
    .concat(event.params.account.toHexString());

  let userMetaVault = UserMetaVaultEntity.load(userId);

  if (!userMetaVault) {
    metaVault.users = metaVault.users.plus(OneBigInt);
    metaVault.save();

    const userEntity = new UserMetaEntity(
      event.address
        .toHexString()
        .concat(":")
        .concat(metaVault.users.toHexString())
    );
    userEntity.address = changetype<Bytes>(event.params.account);
    userEntity.save();

    userMetaVault = new UserMetaVaultEntity(userId);
    userMetaVault.metaVault = event.address;
    userMetaVault.balance = ZeroBigInt;
    userMetaVault.deposited = ZeroBigInt;
    userMetaVault.rewardsEarned = ZeroBigInt;
  }

  // ===== SAFE BALANCES =====
  let wrappedBalance = ZeroBigInt;

  if (metaVault.wrappedMetaVaultId) {
    const wrappedContract = WrappedMetaVaultContract.bind(
      changetype<Address>(metaVault.wrappedMetaVaultId)
    );

    const wrappedResult = wrappedContract.try_balanceOf(event.params.account);

    if (wrappedResult.reverted) {
      log.warning(
        "WrappedMetaVault balanceOf reverted (depositAssets) for {} tx {}",
        [
          event.params.account.toHexString(),
          event.transaction.hash.toHexString(),
        ]
      );
    } else {
      wrappedBalance = wrappedResult.value;
    }
  }

  const metaResult = metaVaultContract.try_balanceOf(event.params.account);

  let metaBalance = ZeroBigInt;
  if (metaResult.reverted) {
    log.warning("MetaVault balanceOf reverted (depositAssets) for {} tx {}", [
      event.params.account.toHexString(),
      event.transaction.hash.toHexString(),
    ]);
  } else {
    metaBalance = metaResult.value;
  }

  const userBalance = metaBalance.plus(wrappedBalance);

  userMetaVault.balance = userBalance;
  userMetaVault.deposited = userBalance.times(metaVault.sharePrice);
  userMetaVault.save();
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
  if (metaVault.type != "MetaVault") return;

  const userId = event.address
    .toHexString()
    .concat(":")
    .concat(event.params.sender.toHexString());

  let userMetaVault = UserMetaVaultEntity.load(userId);
  if (!userMetaVault) {
    userMetaVault = new UserMetaVaultEntity(userId);
    userMetaVault.metaVault = event.address;
    userMetaVault.balance = ZeroBigInt;
    userMetaVault.deposited = ZeroBigInt;
    userMetaVault.rewardsEarned = ZeroBigInt;
  }

  let wrappedBalance = ZeroBigInt;

  if (metaVault.wrappedMetaVaultId) {
    const wrappedContract = WrappedMetaVaultContract.bind(
      changetype<Address>(metaVault.wrappedMetaVaultId)
    );

    const wrappedResult = wrappedContract.try_balanceOf(event.params.sender);

    if (wrappedResult.reverted) {
      log.warning(
        "WrappedMetaVault balanceOf reverted (withdrawAssets) for {} tx {}",
        [
          event.params.sender.toHexString(),
          event.transaction.hash.toHexString(),
        ]
      );
    } else {
      wrappedBalance = wrappedResult.value;
    }
  }

  const metaResult = metaVaultContract.try_balanceOf(event.params.sender);

  let metaBalance = ZeroBigInt;
  if (metaResult.reverted) {
    log.warning("MetaVault balanceOf reverted (withdrawAssets) for {} tx {}", [
      event.params.sender.toHexString(),
      event.transaction.hash.toHexString(),
    ]);
  } else {
    metaBalance = metaResult.value;
  }

  const userBalance = metaBalance.plus(wrappedBalance);

  userMetaVault.balance = userBalance;
  userMetaVault.deposited = userBalance.times(metaVault.sharePrice);
  userMetaVault.save();
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

export function handleRemoveVault(event: RemoveVaultEvent): void {
  const metaVault = MetaVaultEntity.load(event.address) as MetaVaultEntity;

  const removedVault = event.params.vault;
  const updatedVaults: Bytes[] = [];

  for (let i = 0; i < metaVault.vaults.length; i++) {
    if (metaVault.vaults[i].toHexString() != removedVault.toHexString()) {
      updatedVaults.push(metaVault.vaults[i]);
    }
  }

  metaVault.vaults = updatedVaults;

  const metaVaultContract = MetaVaultContract.bind(event.address);
  const updatedAssets = metaVaultContract.assets();
  metaVault.assets = updatedAssets.map<Bytes>((addr) =>
    changetype<Bytes>(addr)
  );

  metaVault.save();
}

export function handleTransfer(event: TransferEvent): void {
  const metaVault = MetaVaultEntity.load(event.address) as MetaVaultEntity;
  if (metaVault.type == "MetaVault") {
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

    let usersCount = metaVault.users;

    if (!spenderUser) {
      usersCount = usersCount.plus(OneBigInt);

      metaVault.users = usersCount;
      metaVault.save();

      const metaVaultAddress = event.address.toHexString();
      const account = changetype<Bytes>(event.params.from);

      const userID = metaVaultAddress
        .concat(":")
        .concat(usersCount.toHexString());

      let userEntity = new UserMetaEntity(userID);
      userEntity.address = account;

      userEntity.save();

      spenderUser = new UserMetaVaultEntity(spenderUserId);
      spenderUser.metaVault = event.address;
      spenderUser.balance = ZeroBigInt;
      spenderUser.deposited = ZeroBigInt;
      spenderUser.rewardsEarned = ZeroBigInt;
    }

    if (!receiverUser) {
      usersCount = usersCount.plus(OneBigInt);

      metaVault.users = usersCount;
      metaVault.save();

      const metaVaultAddress = event.address.toHexString();
      const account = changetype<Bytes>(event.params.to);

      const userID = metaVaultAddress
        .concat(":")
        .concat(usersCount.toHexString());

      let userEntity = new UserMetaEntity(userID);
      userEntity.address = account;

      userEntity.save();

      receiverUser = new UserMetaVaultEntity(receiverUserId);
      receiverUser.metaVault = event.address;
      receiverUser.balance = ZeroBigInt;
      receiverUser.deposited = ZeroBigInt;
      receiverUser.rewardsEarned = ZeroBigInt;
    }

    let wrappedMetaVaultSenderBalance = ZeroBigInt;
    let wrappedMetaVaultReceiverBalance = ZeroBigInt;
    if (metaVault.wrappedMetaVaultId) {
      const wrappedMetaVaultContract = WrappedMetaVaultContract.bind(
        changetype<Address>(metaVault.wrappedMetaVaultId)
      );

      const senderBalanceResult = wrappedMetaVaultContract.try_balanceOf(
        event.params.from
      );
      if (senderBalanceResult.reverted) {
        log.warning(
          "WrappedMetaVault balanceOf call reverted for sender {} at block {} in tx {}",
          [
            event.params.from.toHexString(),
            event.block.number.toString(),
            event.transaction.hash.toHexString(),
          ]
        );
        wrappedMetaVaultSenderBalance = ZeroBigInt;
      } else {
        wrappedMetaVaultSenderBalance = senderBalanceResult.value;
      }

      const receiverBalanceResult = wrappedMetaVaultContract.try_balanceOf(
        event.params.to
      );
      if (receiverBalanceResult.reverted) {
        log.warning(
          "WrappedMetaVault balanceOf call reverted for receiver {} at block {} in tx {}",
          [
            event.params.to.toHexString(),
            event.block.number.toString(),
            event.transaction.hash.toHexString(),
          ]
        );
        wrappedMetaVaultReceiverBalance = ZeroBigInt;
      } else {
        wrappedMetaVaultReceiverBalance = receiverBalanceResult.value;
      }
    }

    const spenderBalanceResult = metaVaultContract.try_balanceOf(
      event.params.from
    );
    const receiverBalanceResult = metaVaultContract.try_balanceOf(
      event.params.to
    );

    let spenderBalance = ZeroBigInt;
    if (spenderBalanceResult.reverted) {
      log.warning(
        "MetaVault balanceOf call reverted for sender {} at block {} in tx {}",
        [
          event.params.from.toHexString(),
          event.block.number.toString(),
          event.transaction.hash.toHexString(),
        ]
      );
      spenderBalance = wrappedMetaVaultSenderBalance;
    } else {
      spenderBalance = spenderBalanceResult.value.plus(
        wrappedMetaVaultSenderBalance
      );
    }

    let receiverBalance = ZeroBigInt;
    if (receiverBalanceResult.reverted) {
      log.warning(
        "MetaVault balanceOf call reverted for receiver {} at block {} in tx {}",
        [
          event.params.to.toHexString(),
          event.block.number.toString(),
          event.transaction.hash.toHexString(),
        ]
      );
      receiverBalance = wrappedMetaVaultReceiverBalance;
    } else {
      receiverBalance = receiverBalanceResult.value.plus(
        wrappedMetaVaultReceiverBalance
      );
    }

    spenderUser.balance = spenderBalance;
    receiverUser.balance = receiverBalance;

    spenderUser.deposited = spenderBalance.times(metaVault.sharePrice);
    receiverUser.deposited = receiverBalance.times(metaVault.sharePrice);

    spenderUser.save();
    receiverUser.save();
  }
}
