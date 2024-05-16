import {
  Address,
  Bytes,
  BigInt,
  ethereum,
  BigDecimal,
} from "@graphprotocol/graph-ts";
import {
  vaultManagerAddress,
  getBalanceAddress,
  ZeroBigInt,
  ZeroBigDecimal,
  OneHundredBigDecimal,
  YearBigDecimal,
  EtherBigDecimal,
  OneBigDecimal,
  platformAddress,
} from "./constants";
import { BigIntToBigDecimal, pow } from "./math";
import { VaultManagerABI as VaultManagerContract } from "../generated/templates/VaultManagerData/VaultManagerABI";
import {
  HardWork as HardWorkEvent,
  StrategyBaseABI as StrategyContract,
} from "../generated/templates/StrategyData/StrategyBaseABI";
import { getBalanceABI as GetBalanceContract } from "../generated/templates/StrategyData/getBalanceABI";
import { VaultABI as VaultContract } from "../generated/templates/VaultData/VaultABI";
import {
  VaultEntity,
  AssetHistoryEntity,
  VaultHistoryEntity,
  VaultAPRsEntity,
  UserVaultEntity,
  UserHistoryEntity,
  UserAllDataEntity,
  LastFeeAMLEntity,
} from "../generated/schema";
import { PlatformABI as PlatformContract } from "../generated/PlatformData/PlatformABI";
import { ERC20UpgradeableABI } from "../generated/templates/FactoryData/ERC20UpgradeableABI";

export function handleHardWork(event: HardWorkEvent): void {
  const strategyContract = StrategyContract.bind(event.address);
  const vaultManagerContract = VaultManagerContract.bind(
    Address.fromString(vaultManagerAddress)
  );

  const vaultAddress = strategyContract.vault();
  const vaultContract = VaultContract.bind(vaultAddress);
  const assestProportions = strategyContract.getAssetsProportions();
  const assetsAmounts = strategyContract.assetsAmounts();

  const vault = VaultEntity.load(vaultAddress) as VaultEntity;
  const vaultInfo = vaultManagerContract.vaultInfo(vaultAddress);

  vault.apr = event.params.apr;
  vault.tvl = event.params.tvl;
  vault.sharePrice = event.params.sharePrice;
  vault.assetsProportions = assestProportions;
  vault.lastHardWork = event.block.timestamp;
  vault.assetsWithApr = changetype<Bytes[]>(vaultInfo.value3);
  vault.assetsAprs = vaultInfo.value4;
  if (event.block.number > BigInt.fromI32(53088320)) {
    const getBalanceContract = GetBalanceContract.bind(
      Address.fromString(getBalanceAddress)
    );
    vault.gasReserve = getBalanceContract.getBalance(vaultAddress);
  }
  vault.save();

  for (let i = 0; i < vault.strategyAssets.length; i++) {
    let assetHistory = new AssetHistoryEntity(
      event.transaction.hash.concatI32(event.logIndex.toI32())
    );
    assetHistory.address = vault.strategyAssets[i];
    assetHistory.price = event.params.assetPrices[i];
    assetHistory.timestamp = event.block.timestamp;
    assetHistory.save();
  }

  //const _VaultUserId = event.address.toHexString().concat(":").concat(event.params.account.toHexString())

  let vaultHistoryEntity = new VaultHistoryEntity(
    event.transaction.hash
      .concatI32(event.transaction.nonce.toI32())
      .toHexString()
      .concat(":")
      .concat(vaultAddress.toHexString())
  );
  vaultHistoryEntity.address = vaultAddress;
  vaultHistoryEntity.sharePrice = event.params.sharePrice;
  vaultHistoryEntity.TVL = event.params.tvl;
  vaultHistoryEntity.timestamp = event.block.timestamp;
  vaultHistoryEntity.APR = event.params.apr;
  vaultHistoryEntity.APR_Compound = event.params.compoundApr;

  //===========24HAPR===========//

  const vaultHistoryAPRsEntity = VaultAPRsEntity.load(
    vaultAddress
  ) as VaultAPRsEntity;
  let _APRArray = vaultHistoryAPRsEntity.APRS;
  let _timestampsArray = vaultHistoryAPRsEntity.timestamps;

  _APRArray.push(event.params.apr);
  _timestampsArray.push(event.block.timestamp);

  _APRArray = _APRArray.reverse();
  _timestampsArray = _timestampsArray.reverse();

  const day = BigInt.fromI32(86400);
  const DENOMINATOR = BigInt.fromI32(100000);
  let threshold = ZeroBigInt;
  let weights: Array<BigInt> = [];
  for (let i = 0; i < _APRArray.length; i++) {
    if (i + 1 == _APRArray.length) {
      break;
    }
    const diff = _timestampsArray[i].minus(_timestampsArray[i + 1]);
    if (threshold.plus(diff) <= day) {
      threshold = threshold.plus(diff);
      weights.push(diff.times(DENOMINATOR).div(day));
    } else {
      const result = day
        .minus(threshold)
        .times(DENOMINATOR)
        .div(day);
      weights.push(result);
      break;
    }
  }

  let APRS: Array<BigInt> = [];

  for (let i = 0; i < weights.length; i++) {
    APRS.push(_APRArray[i].times(weights[i]));
  }

  let averageAPR24H = APRS.reduce(
    (accumulator: BigInt, currentValue: BigInt) =>
      accumulator.plus(currentValue),
    ZeroBigInt
  );
  averageAPR24H = averageAPR24H.div(DENOMINATOR);

  //===========WeeklyAPR===========//

  const week = BigInt.fromI32(604800);
  threshold = ZeroBigInt;
  let weightsWeeklyAPR: Array<BigInt> = [];
  for (let i = 0; i < _APRArray.length; i++) {
    if (i + 1 == _APRArray.length) {
      break;
    }
    const diff = _timestampsArray[i].minus(_timestampsArray[i + 1]);
    if (threshold.plus(diff) <= week) {
      threshold = threshold.plus(diff);
      weightsWeeklyAPR.push(diff.times(DENOMINATOR).div(week));
    } else {
      const result = week
        .minus(threshold)
        .times(DENOMINATOR)
        .div(week);
      weightsWeeklyAPR.push(result);
      break;
    }
  }

  let WeeklyAPRS: Array<BigInt> = [];

  for (let i = 0; i < weightsWeeklyAPR.length; i++) {
    WeeklyAPRS.push(_APRArray[i].times(weightsWeeklyAPR[i]));
  }

  let averageWeeklyAPR = WeeklyAPRS.reduce(
    (accumulator: BigInt, currentValue: BigInt) =>
      accumulator.plus(currentValue),
    ZeroBigInt
  );

  vaultHistoryEntity.APRWeekly = averageWeeklyAPR.div(DENOMINATOR);
  //===========Get platform data===========//
  const platformContract = PlatformContract.bind(
    Address.fromString(platformAddress)
  );
  const getPlatformBalance = platformContract.getBalance(event.address);

  const tokensAddress = getPlatformBalance.value0;

  const formatedTokensAddress: Bytes[] = [];

  for (let i = 0; i < tokensAddress.length; i++) {
    formatedTokensAddress.push(changetype<Bytes>(tokensAddress[i]));
  }

  const prices = getPlatformBalance.value1;

  const assetsPrice = new Map<string, BigInt>();

  for (let i = 0; i < tokensAddress.length; i++) {
    assetsPrice.set(tokensAddress[i].toString(), prices[i]);
  }

  //======================VS HOLD======================//

  const strategyAssets = assetsAmounts.value0;
  let strategyAssetsAmounts: BigInt[] = [];

  if (vault.initAssetsAmounts) {
    strategyAssetsAmounts = vault.initAssetsAmounts as BigInt[];
  }

  let holdYearPercentDiff: BigDecimal = ZeroBigDecimal;
  let holdPercentDiff: BigDecimal = ZeroBigDecimal;
  let sum: BigDecimal = ZeroBigDecimal;
  let sharePriceDifference: BigDecimal = ZeroBigDecimal;
  let daysFromCreation: String = "";

  const holdTokenPresentProportion: String[] = [];
  const holdTokenAPR: String[] = [];
  const amounts: String[] = [];
  const amountsInUSD: String[] = [];
  const proportions: String[] = [];

  const sharePriceOnCreation: BigDecimal = OneBigDecimal;

  const sharePrice: BigDecimal = BigDecimal.fromString(
    vault.sharePrice.toString()
  ).div(EtherBigDecimal);

  if (
    strategyAssets.length &&
    strategyAssetsAmounts.length &&
    assetsPrice &&
    vault.AssetsPricesOnCreation.length
  ) {
    const tokensDecimals: BigInt[] = strategyAssets.map<BigInt>(
      (asset: Address) => {
        const tokenContract = ERC20UpgradeableABI.bind(asset);
        const decimals = tokenContract.decimals();
        return BigInt.fromI32(decimals);
      }
    );

    for (let i = 0; i < strategyAssetsAmounts.length; i++) {
      let amount: BigDecimal = BigDecimal.fromString(
        strategyAssetsAmounts[i].toString()
      ).div(
        pow(
          BigDecimal.fromString("10"),
          BigInt.fromI32(tokensDecimals[i].toI32())
        )
      );
      amounts.push(amount.toString());
    }

    for (let i = 0; i < amounts.length; i++) {
      let address = strategyAssets[i];

      const price = assetsPrice.get(address.toString()).toString();

      let amountInUSD: BigDecimal = BigDecimal.fromString(price)
        .div(EtherBigDecimal)
        .times(BigDecimal.fromString(amounts[i]));

      amountsInUSD.push(amountInUSD.toString());
    }

    for (let i = 0; i < amountsInUSD.length; i++) {
      sum = sum.plus(BigDecimal.fromString(amountsInUSD[i]));
    }

    for (let i = 0; i < amountsInUSD.length; i++) {
      if (amountsInUSD[i]) {
        let proportion = BigDecimal.fromString(amountsInUSD[i])
          .div(sum)
          .times(OneHundredBigDecimal);
        proportions.push(proportion.toString());
      } else {
        proportions.push("0");
      }
    }

    sharePriceDifference = sharePrice
      .minus(sharePriceOnCreation)
      .times(OneHundredBigDecimal);

    const currentTime = event.block.timestamp;
    const differenceInSeconds = currentTime.minus(vault.created);

    daysFromCreation = differenceInSeconds
      .div(BigInt.fromI32(60 * 60 * 24))
      .toString();

    if (BigDecimal.fromString(daysFromCreation).lt(OneBigDecimal)) {
      daysFromCreation = "1";
    }

    for (let i = 0; i < strategyAssets.length; i++) {
      let assetPrice: BigDecimal = BigDecimal.fromString(
        assetsPrice[strategyAssets[i].toString()].toString()
      ).div(EtherBigDecimal);

      let assetPriceOnCreation: BigDecimal = BigDecimal.fromString(
        vault.AssetsPricesOnCreation[i].toString()
      ).div(EtherBigDecimal);

      const startProportion: BigDecimal = OneBigDecimal.div(
        OneHundredBigDecimal
      ).times(BigDecimal.fromString(proportions[i]));

      const proportionPrice: BigDecimal = startProportion.div(
        assetPriceOnCreation
      );

      const presentAmount: BigDecimal = proportionPrice.times(assetPrice);

      const priceDifference: BigDecimal = assetPrice
        .minus(assetPriceOnCreation)
        .div(assetPriceOnCreation)
        .times(OneHundredBigDecimal);

      const percentDiff: BigDecimal = sharePriceDifference.minus(
        priceDifference
      );

      let yearPercentDiff = percentDiff
        .div(BigDecimal.fromString(daysFromCreation))
        .times(YearBigDecimal);

      if (yearPercentDiff.lt(BigDecimal.fromString("-100"))) {
        yearPercentDiff = BigDecimal.fromString("-99.99");
      }

      holdTokenPresentProportion.push(presentAmount.toString());
      holdTokenAPR.push(yearPercentDiff.toString());
    }

    const holdPrice = holdTokenPresentProportion.reduce(
      (acc: BigDecimal, cur: String) => acc.plus(BigDecimal.fromString(cur)),
      ZeroBigDecimal
    );

    const priceDifference: BigDecimal = holdPrice
      .minus(sharePriceOnCreation)
      .times(OneHundredBigDecimal);

    holdPercentDiff = sharePriceDifference.minus(priceDifference);

    holdYearPercentDiff = holdPercentDiff
      .div(BigDecimal.fromString(daysFromCreation))
      .times(YearBigDecimal);

    if (holdYearPercentDiff.lt(BigDecimal.fromString("-100"))) {
      holdYearPercentDiff = BigDecimal.fromString("-99.99");
    }
  }

  // ============================================ //
  vaultHistoryEntity.daysFromCreation = daysFromCreation;
  vaultHistoryEntity.vsHoldAPR = holdYearPercentDiff.toString();
  vaultHistoryEntity.tokensVsHoldAPR = holdTokenAPR;

  //===========LifeTimeAPR===========//

  const lifeLength = _timestampsArray[0].minus(vault.created);

  let weightsLifeTime: Array<BigInt> = [];
  for (let i = 0; i < _APRArray.length; i++) {
    if (i + 1 == _APRArray.length) {
      break;
    }
    const diff = _timestampsArray[i].minus(_timestampsArray[i + 1]);
    weightsLifeTime.push(diff.times(DENOMINATOR).div(lifeLength));
  }

  let LifeTimeAPRS: Array<BigInt> = [];

  for (let i = 0; i < weightsLifeTime.length; i++) {
    LifeTimeAPRS.push(_APRArray[i].times(weightsLifeTime[i]));
  }

  let LifeTimeAPR = LifeTimeAPRS.reduce(
    (accumulator: BigInt, currentValue: BigInt) =>
      accumulator.plus(currentValue),
    ZeroBigInt
  );

  vault.lifeTimeAPR = LifeTimeAPR.div(DENOMINATOR);

  _APRArray = _APRArray.reverse();
  _timestampsArray = _timestampsArray.reverse();

  vaultHistoryAPRsEntity.APRS = _APRArray;
  vaultHistoryAPRsEntity.timestamps = _timestampsArray;
  vaultHistoryAPRsEntity.save();
  vaultHistoryEntity.APR24H = averageAPR24H;
  vaultHistoryEntity.save();

  //===========vaultHistoryEntity(VaultEntity)===========//
  let _vaultHistoryEntity = vault.vaultHistoryEntity;
  if (_vaultHistoryEntity) {
    _vaultHistoryEntity.push(vaultHistoryEntity.id);
  } else {
    _vaultHistoryEntity = [];
    _vaultHistoryEntity.push(vaultHistoryEntity.id);
  }

  vault.vaultHistoryEntity = _vaultHistoryEntity;

  //===========Earn===========//
  const usersList = vault.vaultUsersList;
  const totalSupply = vaultContract.totalSupply();
  const EARNED = event.params.earned;
  for (let i = 0; i < usersList.length; i++) {
    let userVault = UserVaultEntity.load(usersList[i]) as UserVaultEntity;
    if (userVault.deposited == ZeroBigInt) {
      continue;
    }
    const userAddress = Address.fromString(usersList[i].split(":")[1]);
    const rewardByToken = EARNED.times(DENOMINATOR).div(totalSupply);
    const reward = vaultContract
      .balanceOf(userAddress)
      .times(rewardByToken)
      .div(DENOMINATOR);
    userVault.rewardsEarned = userVault.rewardsEarned.plus(reward);
    userVault.save();

    let userHistory = new UserHistoryEntity(
      event.transaction.hash.concatI32(event.logIndex.toI32())
    );

    let userAllDataEntity = UserAllDataEntity.load(
      userAddress
    ) as UserAllDataEntity;
    userAllDataEntity.rewardsEarned = userAllDataEntity.rewardsEarned.plus(
      reward
    );
    userAllDataEntity.save();

    userHistory.userAddress = userAddress;
    userHistory.rewardsEarned = userAllDataEntity.rewardsEarned;
    userHistory.deposited = userAllDataEntity.deposited;
    userHistory.timestamp = event.block.timestamp;
    userHistory.save();

    let usersVault = vault.userVault;
    if (usersVault) {
      usersVault.push(usersList[i]);
    } else {
      usersVault = [];
      usersVault.push(usersList[i]);
    }

    vault.userVault = usersVault;
    vault.save();
  }
}
