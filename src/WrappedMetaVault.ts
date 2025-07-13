import { Bytes } from "@graphprotocol/graph-ts";
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

  const prevDeposited = wrappedMetaVault.deposited;

  wrappedMetaVault.deposited = prevDeposited.plus(event.params.assets);

  wrappedMetaVault.save();

  //===========UserMetaVaultEntity===========//
  const metaVault = MetaVaultEntity.load(metaVaultAddress);
  if (metaVault) {
    if (metaVault.type == "MetaVault") {
      const _MetaVaultUserId = metaVaultAddress
        .toHexString()
        .concat(":")
        .concat(event.params.sender.toHexString());

      let userMetaVault = UserMetaVaultEntity.load(_MetaVaultUserId);

      if (!userMetaVault) {
        let usersCount = metaVault.users;
        const metaVaultAddress = event.address.toHexString();
        const account = changetype<Bytes>(event.params.sender);

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
        userMetaVault.metaVault = metaVault.id;
        userMetaVault.balance = ZeroBigInt;
        userMetaVault.deposited = ZeroBigInt;
        userMetaVault.rewardsEarned = ZeroBigInt;
      }

      const wrappedUserBalance = wrappedMetaVaultContract.balanceOf(
        event.params.sender
      );

      const metaVaultUserBalance = metaVaultContract.balanceOf(
        event.params.sender
      );

      const sharePrice = metaVault.sharePrice;

      const userBalance = wrappedUserBalance.plus(metaVaultUserBalance);

      userMetaVault.balance = userBalance;

      userMetaVault.deposited = userBalance.times(sharePrice);

      userMetaVault.save();
    }
  }
}

export function handleWithdraw(event: WithdrawEvent): void {
  const wrappedMetaVault = WrappedMetaVaultEntity.load(
    event.address
  ) as WrappedMetaVaultEntity;

  const wrappedMetaVaultContract = WrappedMetaVaultContract.bind(event.address);

  const metaVaultAddress = wrappedMetaVaultContract.metaVault();

  const metaVaultContract = MetaVaultContract.bind(metaVaultAddress);

  const prevDeposited = wrappedMetaVault.deposited;
  const assets = event.params.assets;

  wrappedMetaVault.deposited = prevDeposited.ge(assets)
    ? prevDeposited.minus(assets)
    : ZeroBigInt;

  wrappedMetaVault.save();

  //===========UserMetaVaultEntity===========//
  const metaVault = MetaVaultEntity.load(metaVaultAddress);
  if (metaVault) {
    if (metaVault.type == "MetaVault") {
      const _MetaVaultUserId = metaVaultAddress
        .toHexString()
        .concat(":")
        .concat(event.params.sender.toHexString());

      let userMetaVault = UserMetaVaultEntity.load(_MetaVaultUserId);

      if (!userMetaVault) {
        userMetaVault = new UserMetaVaultEntity(_MetaVaultUserId);
        userMetaVault.metaVault = metaVault.id;
        userMetaVault.balance = ZeroBigInt;
        userMetaVault.deposited = ZeroBigInt;
        userMetaVault.rewardsEarned = ZeroBigInt;
      }

      const wrappedUserBalance = wrappedMetaVaultContract.balanceOf(
        event.params.sender
      );

      const metaVaultUserBalance = metaVaultContract.balanceOf(
        event.params.sender
      );

      const sharePrice = metaVault.sharePrice;

      const userBalance = wrappedUserBalance.plus(metaVaultUserBalance);

      userMetaVault.balance = userBalance;

      userMetaVault.deposited = userBalance.times(sharePrice);

      userMetaVault.save();
    }
  }
}

export function handleTransfer(event: TransferEvent): void {
  const wrappedMetaVaultContract = WrappedMetaVaultContract.bind(event.address);

  const metaVaultAddress = wrappedMetaVaultContract.metaVault();

  const metaVaultContract = MetaVaultContract.bind(metaVaultAddress);

  const spenderUserId = metaVaultAddress
    .toHexString()
    .concat(":")
    .concat(event.params.from.toHexString());

  const receiverUserId = metaVaultAddress
    .toHexString()
    .concat(":")
    .concat(event.params.to.toHexString());

  //===========UserMetaVaultEntity===========//
  let spenderUser = UserMetaVaultEntity.load(spenderUserId);
  let receiverUser = UserMetaVaultEntity.load(receiverUserId);
  const metaVault = MetaVaultEntity.load(metaVaultAddress);

  if (metaVault) {
    if (metaVault.type == "MetaVault") {
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
        spenderUser.metaVault = metaVault.id;
        spenderUser.balance = ZeroBigInt;
        spenderUser.deposited = ZeroBigInt;
        spenderUser.rewardsEarned = ZeroBigInt;
      }

      if (!receiverUser) {
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

        receiverUser = new UserMetaVaultEntity(receiverUserId);
        receiverUser.metaVault = metaVault.id;
        receiverUser.balance = ZeroBigInt;
        receiverUser.deposited = ZeroBigInt;
        receiverUser.rewardsEarned = ZeroBigInt;
      }

      const wrappedSpenderBalance = wrappedMetaVaultContract.balanceOf(
        event.params.from
      );
      const wrappedReceiverBalance = wrappedMetaVaultContract.balanceOf(
        event.params.to
      );

      const metaVaultSpenderBalance = metaVaultContract.balanceOf(
        event.params.from
      );
      const metaVaultReceiverBalance = metaVaultContract.balanceOf(
        event.params.to
      );

      const spenderBalance = wrappedSpenderBalance.plus(
        metaVaultSpenderBalance
      );
      const receiverBalance = wrappedReceiverBalance.plus(
        metaVaultReceiverBalance
      );

      spenderUser.balance = spenderBalance;
      receiverUser.balance = receiverBalance;

      const sharePrice = metaVault.sharePrice;

      spenderUser.deposited = spenderBalance.times(sharePrice);
      receiverUser.deposited = receiverBalance.times(sharePrice);

      spenderUser.save();
      receiverUser.save();
    }
  }
}
