import {
  Address,
  Bytes,
  BigInt,
  BigDecimal,
  ethereum,
  log,
} from "@graphprotocol/graph-ts";
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
  VaultMetricsEntity,
  UserVaultEntity,
  UserHistoryEntity,
  UserAllDataEntity,
} from "../generated/schema";

import { ERC20UpgradeableABI } from "../generated/templates/FactoryData/ERC20UpgradeableABI";
import { SwapperABI as SwapperContract } from "../generated/templates/SwapperData/SwapperABI";

import { MulticallABI as MulticallContract } from "../generated/templates/StrategyData/MulticallABI";
import { ILeverageLendingStrategyABI as LeverageLendingContract } from "../generated/templates/LeverageLendingStrategyData/ILeverageLendingStrategyABI";

import {
  vaultManagerAddress,
  getBalanceAddress,
  ZeroBigInt,
  ZeroBigDecimal,
  OneHundredBigDecimal,
  YearBigDecimal,
  EtherBigDecimal,
  OneBigDecimal,
  WeekInSecondsBigDecimal,
  DayInSecondsBigDecimal,
  DayInSecondsBigInt,
  priceReaderAddress,
  swapperAddress,
  multicallAddress,
  oneEther,
} from "./utils/constants";

import { pow } from "./utils/math";

import { calculateVsHoldByPeriod } from "./utils/functions";

import { NETWORK } from "./utils/network";

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

  const vaultMetricsEntity = VaultMetricsEntity.load(
    vaultAddress
  ) as VaultMetricsEntity;

  const vaultInfo = vaultManagerContract.vaultInfo(vaultAddress);

  const lastSharePrice = BigDecimal.fromString(vault.sharePrice.toString()).div(
    EtherBigDecimal
  );

  let _sharePrice = event.params.sharePrice;

  if (vault.isLendingLeverageStrategy) {
    const leverageStrategyContract = LeverageLendingContract.bind(
      event.address
    );

    _sharePrice = leverageStrategyContract.realSharePrice().value0;
  }

  vault.apr = event.params.apr;
  vault.tvl = event.params.tvl;
  vault.sharePrice = _sharePrice;
  vault.assetsProportions = assestProportions;
  vault.lastHardWork = event.block.timestamp;
  vault.assetsWithApr = changetype<Bytes[]>(vaultInfo.value3);
  vault.assetsAprs = vaultInfo.value4;
  // @ts-ignore
  if (event.block.number > BigInt.fromI32(53088320) && NETWORK === "matic") {
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
  vaultHistoryEntity.sharePrice = _sharePrice;
  vaultHistoryEntity.TVL = event.params.tvl;
  vaultHistoryEntity.timestamp = event.block.timestamp;
  vaultHistoryEntity.APR = event.params.apr;
  vaultHistoryEntity.APR_Compound = event.params.compoundApr;
  vaultHistoryEntity.save();

  //***** Get timestamp from last HardWork to calculate days from event ******//

  let lastTimestamp = vault.created;

  if (vaultMetricsEntity.timestamps.length) {
    lastTimestamp =
      vaultMetricsEntity.timestamps[vaultMetricsEntity.timestamps.length - 1];
  }

  const currentTime = event.block.timestamp;
  const differenceInSeconds = currentTime.minus(lastTimestamp);
  const differenceInSecondsFromCreation = currentTime.minus(vault.created);

  let daysFromLastHardWork: BigDecimal = differenceInSeconds
    .toBigDecimal()
    .div(BigDecimal.fromString((60 * 60 * 24).toString()));

  let daysFromCreation: string = differenceInSecondsFromCreation
    .div(BigInt.fromI32(60 * 60 * 24))
    .toString();

  if (daysFromLastHardWork.equals(ZeroBigDecimal)) {
    daysFromLastHardWork = BigDecimal.fromString("1");
  }

  if (BigDecimal.fromString(daysFromCreation).lt(OneBigDecimal)) {
    daysFromCreation = "1";
  }

  //===========dailyAPR===========//
  let _APRArray = vaultMetricsEntity.APRS;
  let _timestampsArray = vaultMetricsEntity.timestamps;
  let _periodVsHoldAPRs = vaultMetricsEntity.periodVsHoldAPRs;
  let _periodAsset1VsHoldAPRs = vaultMetricsEntity.periodAsset1VsHoldAPRs;
  let _periodAsset2VsHoldAPRs = vaultMetricsEntity.periodAsset2VsHoldAPRs;

  _APRArray.push(event.params.apr);
  _timestampsArray.push(event.block.timestamp);

  _APRArray.reverse();
  _timestampsArray.reverse();

  const day = DayInSecondsBigInt;
  let relativeWeek = BigInt.fromI32(604800);

  if (BigInt.fromString(daysFromCreation).lt(BigInt.fromI32(7))) {
    relativeWeek = DayInSecondsBigInt.times(
      BigInt.fromString(daysFromCreation)
    );
  }

  const DENOMINATOR = BigInt.fromI32(100000);

  const dailyAPRs: Array<BigInt> = [];
  const weeklyAPRs: Array<BigInt> = [];

  const dailyWeights: Array<BigInt> = [];
  const weeklyWeights: Array<BigInt> = [];

  let threshold = ZeroBigInt;

  for (let i = 0; i < _APRArray.length; i++) {
    if (i + 1 == _APRArray.length) {
      break;
    }
    const diff = _timestampsArray[i].minus(_timestampsArray[i + 1]);
    if (threshold.plus(diff) <= day) {
      threshold = threshold.plus(diff);
      dailyWeights.push(diff.times(DENOMINATOR).div(day));
    } else {
      const result = day
        .minus(threshold)
        .times(DENOMINATOR)
        .div(day);
      dailyWeights.push(result);
      break;
    }
  }

  for (let i = 0; i < dailyWeights.length; i++) {
    dailyAPRs.push(_APRArray[i].times(dailyWeights[i]));
  }

  let averageDailyAPR = dailyAPRs
    .reduce(
      (accumulator: BigInt, currentValue: BigInt) =>
        accumulator.plus(currentValue),
      ZeroBigInt
    )
    .div(DENOMINATOR);

  //===========weeklyAPR===========//
  threshold = ZeroBigInt;

  for (let i = 0; i < _APRArray.length; i++) {
    if (i + 1 == _APRArray.length) {
      break;
    }
    const diff = _timestampsArray[i].minus(_timestampsArray[i + 1]);
    if (threshold.plus(diff) <= relativeWeek) {
      threshold = threshold.plus(diff);
      weeklyWeights.push(diff.times(DENOMINATOR).div(relativeWeek));
    } else {
      const result = relativeWeek
        .minus(threshold)
        .times(DENOMINATOR)
        .div(relativeWeek);
      weeklyWeights.push(result);
      break;
    }
  }

  for (let i = 0; i < weeklyWeights.length; i++) {
    weeklyAPRs.push(_APRArray[i].times(weeklyWeights[i]));
  }

  let averageWeeklyAPR = weeklyAPRs
    .reduce(
      (accumulator: BigInt, currentValue: BigInt) =>
        accumulator.plus(currentValue),
      ZeroBigInt
    )
    .div(DENOMINATOR);

  if (BigInt.fromString(daysFromCreation).lt(BigInt.fromI32(2))) {
    averageDailyAPR = _APRArray
      .reduce(
        (accumulator: BigInt, currentValue: BigInt) =>
          accumulator.plus(currentValue),
        ZeroBigInt
      )
      .div(BigInt.fromI32(_APRArray.length));
    averageWeeklyAPR = averageDailyAPR;
  }

  vaultHistoryEntity.APR24H = averageDailyAPR;
  vaultHistoryEntity.APRWeekly = averageWeeklyAPR;
  vaultHistoryEntity.save();

  //===========Earn===========//
  const usersList = vault.vaultUsersList;
  const totalSupply = vaultContract.totalSupply();

  let EARNED = event.params.earned;

  if (EARNED.lt(ZeroBigInt)) {
    EARNED = ZeroBigInt;
  }

  for (let i = 0; i < usersList.length; i++) {
    let userVault = UserVaultEntity.load(usersList[i]) as UserVaultEntity;
    if (userVault.deposited == ZeroBigInt) {
      continue;
    }

    const userAddress = Address.fromString(usersList[i].split(":")[1]);

    const rewardByToken = EARNED.times(DENOMINATOR).div(totalSupply);

    const reward = userVault.balance.times(rewardByToken).div(DENOMINATOR);

    userVault.rewardsEarned = userVault.rewardsEarned.plus(reward);
    userVault.save();

    let userHistory = new UserHistoryEntity(
      event.transaction.hash.concatI32(event.logIndex.toI32())
    );

    let userAllDataEntity = UserAllDataEntity.load(userAddress);

    if (!userAllDataEntity) {
      const userVaults = [changetype<Bytes>(event.address)];

      userAllDataEntity = new UserAllDataEntity(userAddress);
      userAllDataEntity.rewardsEarned = ZeroBigInt;
      userAllDataEntity.vaults = userVaults;
      userAllDataEntity.deposited = ZeroBigInt;
    }

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
  //===========Get assets prices===========//
  const swapper = SwapperContract.bind(Address.fromString(swapperAddress));

  const multicallContract = MulticallContract.bind(
    Address.fromString(multicallAddress)
  );

  const assetsAddresses = swapper.allAssets();

  const assetsPrice = new Map<string, BigInt>();

  const calls: Array<ethereum.Tuple> = [];

  const getPriceSignature = Bytes.fromHexString("0x41976e09");

  for (let i = 0; i < assetsAddresses.length; i++) {
    const encodedAddress = ethereum.encode(
      ethereum.Value.fromAddress(assetsAddresses[i])
    )!;
    if (encodedAddress) {
      const callData = Bytes.fromUint8Array(
        getPriceSignature.concat(encodedAddress)
      );
      calls.push(
        changetype<ethereum.Tuple>([
          ethereum.Value.fromAddress(Address.fromString(priceReaderAddress)),
          ethereum.Value.fromBytes(callData),
        ])
      );
    }
  }

  const callResult = multicallContract.tryCall(
    "aggregate",
    "aggregate((address,bytes)[]):(uint256,bytes[])",
    [ethereum.Value.fromTupleArray(calls)]
  );

  if (callResult.reverted) {
    log.error("Multicall failed", []);
    return;
  }

  const returnData = callResult.value[1].toBytesArray();

  for (let i = 0; i < returnData.length; i++) {
    const decodedValue = ethereum.decode("uint256", returnData[i]);
    if (decodedValue) {
      const price = decodedValue.toBigInt();
      assetsPrice.set(assetsAddresses[i].toString(), price);
    } else {
      log.warning("Failed to decode price for asset {}", [
        assetsAddresses[i].toHexString(),
      ]);
    }
  }

  //======================VS HOLD======================//
  const strategyAssets = assetsAmounts.value0;

  let strategyAssetsAmounts: BigInt[] = [];

  if (vault.initAssetsAmounts) {
    strategyAssetsAmounts = vault.initAssetsAmounts as BigInt[];
  }

  const amounts: string[] = [];
  const amountsInUSD: string[] = [];
  let amountsSum: BigDecimal = ZeroBigDecimal;

  const proportions: string[] = [];
  const holdAssetProportion: string[] = [];

  const lastAssetsPrices: string[] = [];
  const assetsPrices: string[] = [];
  let assetsSumPercentDiff: BigDecimal = ZeroBigDecimal;

  let periodVsHoldAPR: string = "";
  const periodAssetsVsHoldAPR: string[] = [];

  const lifetimeAssetsVsHold: string[] = [];
  const assetsVsHoldAPR: string[] = [];

  const assetsVsHold24H: string[] = [];
  const assetsVsHoldWeekly: string[] = [];

  let lifetimeVsHold: BigDecimal = OneBigDecimal;
  let vsHoldAPR: BigDecimal = OneBigDecimal;

  let priceDifference: BigDecimal = ZeroBigDecimal;

  const sharePriceOnCreation: BigDecimal = OneBigDecimal;

  const sharePrice = BigDecimal.fromString(_sharePrice.toString()).div(
    EtherBigDecimal
  );

  let periodSharePricePercentDiff = sharePrice
    .minus(lastSharePrice)
    .div(lastSharePrice)
    .times(OneHundredBigDecimal);

  let lifetimeSharePricePercentDiff = sharePrice
    .minus(sharePriceOnCreation)
    .times(OneHundredBigDecimal);

  //***** Calculate vsHoldAPRs ******//
  if (
    strategyAssets.length &&
    strategyAssetsAmounts.length &&
    assetsPrice &&
    vault.AssetsPricesOnCreation.length
  ) {
    // Get tokens amounts
    for (let i = 0; i < strategyAssetsAmounts.length; i++) {
      let amount: BigDecimal = BigDecimal.fromString(
        strategyAssetsAmounts[i].toString()
      ).div(
        pow(
          BigDecimal.fromString("10"),
          BigInt.fromI32(vault.strategyAssetsDecimals[i].toI32())
        )
      );
      amounts.push(amount.toString());
    }

    // Get assets amounts in USD
    for (let i = 0; i < amounts.length; i++) {
      let address = strategyAssets[i];

      const price = assetsPrice.get(address.toString()).toString();

      let amountInUSD: BigDecimal = BigDecimal.fromString(price)
        .div(EtherBigDecimal)
        .times(BigDecimal.fromString(amounts[i]));

      amountsInUSD.push(amountInUSD.toString());
    }

    // Amounts sum
    for (let i = 0; i < amountsInUSD.length; i++) {
      amountsSum = amountsSum.plus(BigDecimal.fromString(amountsInUSD[i]));
    }

    // Get assets proportions
    for (let i = 0; i < amountsInUSD.length; i++) {
      if (amountsInUSD[i]) {
        let proportion = BigDecimal.fromString(amountsInUSD[i])
          .div(amountsSum)
          .times(OneHundredBigDecimal);
        proportions.push(proportion.toString());
      } else {
        proportions.push("0");
      }
    }

    // 1) Set lastAssetsPrices for next hardwork
    // 2) Get assets VS HOLD APR
    for (let i = 0; i < strategyAssets.length; i++) {
      let assetPrice: BigDecimal = BigDecimal.fromString(
        assetsPrice[strategyAssets[i].toString()].toString()
      ).div(EtherBigDecimal);

      let assetPriceOnCreation: BigDecimal = BigDecimal.fromString(
        vault.AssetsPricesOnCreation[i].toString()
      ).div(EtherBigDecimal);

      lastAssetsPrices.push(assetPrice.toString());
      assetsPrices.push(assetPrice.toString());

      let lastAssetPrice: BigDecimal = BigDecimal.fromString(
        vault.AssetsPricesOnCreation[i].toString()
      ).div(EtherBigDecimal);

      if (
        vault.lastAssetsPrices != null &&
        vault.lastAssetsPrices.length > i &&
        vault.lastAssetsPrices[i] != null
      ) {
        lastAssetPrice = BigDecimal.fromString(vault.lastAssetsPrices[i]);
      }

      const startProportion: BigDecimal = OneBigDecimal.div(
        OneHundredBigDecimal
      ).times(BigDecimal.fromString(proportions[i]));

      const lifetimeProportionPrice: BigDecimal = startProportion.div(
        assetPriceOnCreation
      );

      const lifetimePresentAmount: BigDecimal = lifetimeProportionPrice.times(
        assetPrice
      );

      priceDifference = assetPrice
        .minus(lastAssetPrice)
        .div(lastAssetPrice)
        .times(OneHundredBigDecimal);

      const lifetimePriceDifference: BigDecimal = assetPrice
        .minus(assetPriceOnCreation)
        .div(assetPriceOnCreation)
        .times(OneHundredBigDecimal);

      const percentDiff: BigDecimal = periodSharePricePercentDiff.minus(
        priceDifference
      );

      const lifetimePercentDiff: BigDecimal = lifetimeSharePricePercentDiff.minus(
        lifetimePriceDifference
      );

      const periodAssetVsHoldAPR = percentDiff
        .div(daysFromLastHardWork)
        .times(YearBigDecimal)
        .toString();

      let assetVsHoldAPR = lifetimePercentDiff
        .div(BigDecimal.fromString(daysFromCreation))
        .times(YearBigDecimal);

      if (assetVsHoldAPR.lt(BigDecimal.fromString("-100"))) {
        assetVsHoldAPR = BigDecimal.fromString("-99.99");
      }

      // Metrics
      const periodAssetsVsHoldAPRs = [
        _periodAsset1VsHoldAPRs,
        _periodAsset2VsHoldAPRs,
      ];

      periodAssetsVsHoldAPRs[i].push(periodAssetVsHoldAPR);
      periodAssetsVsHoldAPRs[i].reverse();

      const assetVsHold24H = calculateVsHoldByPeriod(
        periodAssetsVsHoldAPRs[i],
        _timestampsArray,
        DayInSecondsBigDecimal
      );

      const assetVsHoldWeekly = calculateVsHoldByPeriod(
        periodAssetsVsHoldAPRs[i],
        _timestampsArray,
        WeekInSecondsBigDecimal
      );

      assetsVsHold24H.push(assetVsHold24H);
      assetsVsHoldWeekly.push(assetVsHoldWeekly);

      // Metrics

      holdAssetProportion.push(lifetimePresentAmount.toString());

      periodAssetsVsHoldAPR.push(periodAssetVsHoldAPR);

      lifetimeAssetsVsHold.push(lifetimePercentDiff.toString());
      assetsVsHoldAPR.push(assetVsHoldAPR.toString());
    }

    // Get period VS HOLD APR
    if (vault.lastAssetsSum == "0" || vault.lastAssetsSum == null) {
      assetsSumPercentDiff = ZeroBigDecimal;
    } else {
      assetsSumPercentDiff = amountsSum
        .minus(BigDecimal.fromString(vault.lastAssetsSum))
        .div(BigDecimal.fromString(vault.lastAssetsSum))
        .times(OneHundredBigDecimal);
    }

    periodVsHoldAPR = periodSharePricePercentDiff
      .minus(assetsSumPercentDiff)
      .div(daysFromLastHardWork)
      .times(YearBigDecimal)
      .toString();

    // Get lifetime VS HOLD APR
    const holdPrice = holdAssetProportion.reduce(
      (acc: BigDecimal, cur: string) => acc.plus(BigDecimal.fromString(cur)),
      ZeroBigDecimal
    );

    priceDifference = holdPrice
      .minus(sharePriceOnCreation)
      .times(OneHundredBigDecimal);

    lifetimeVsHold = lifetimeSharePricePercentDiff.minus(priceDifference);

    vsHoldAPR = lifetimeVsHold
      .div(BigDecimal.fromString(daysFromCreation))
      .times(YearBigDecimal);

    if (vsHoldAPR.lt(BigDecimal.fromString("-100"))) {
      vsHoldAPR = BigDecimal.fromString("-99.99");
    }
  }

  // Calculate vsHold24H && vsHoldWeekly
  _periodVsHoldAPRs.push(periodVsHoldAPR);
  _periodVsHoldAPRs.reverse();

  const vsHold24H = calculateVsHoldByPeriod(
    _periodVsHoldAPRs,
    _timestampsArray,
    DayInSecondsBigDecimal
  );

  const vsHoldWeekly = calculateVsHoldByPeriod(
    _periodVsHoldAPRs,
    _timestampsArray,
    WeekInSecondsBigDecimal
  );

  // ============================================ //
  vaultHistoryEntity.daysFromCreation = daysFromCreation;
  vaultHistoryEntity.lastAssetsPrices = lastAssetsPrices;

  vaultHistoryEntity.periodVsHoldAPR = periodVsHoldAPR;
  vaultHistoryEntity.periodAssetsVsHoldAPR = periodAssetsVsHoldAPR;

  vaultHistoryEntity.lifetimeVsHold = lifetimeVsHold.toString();
  vaultHistoryEntity.lifetimeAssetsVsHold = lifetimeAssetsVsHold;

  vaultHistoryEntity.vsHold24H = vsHold24H;
  vaultHistoryEntity.vsHoldWeekly = vsHoldWeekly;

  vaultHistoryEntity.assetsVsHold24H = assetsVsHold24H;
  vaultHistoryEntity.assetsVsHoldWeekly = assetsVsHoldWeekly;

  vaultHistoryEntity.vsHoldAPR = vsHoldAPR.toString();
  vaultHistoryEntity.assetsVsHoldAPR = assetsVsHoldAPR;

  vaultHistoryEntity.save();
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

  _APRArray.reverse();
  _timestampsArray.reverse();
  _periodVsHoldAPRs.reverse();
  _periodAsset1VsHoldAPRs.reverse();
  _periodAsset2VsHoldAPRs.reverse();

  vaultMetricsEntity.APRS = _APRArray;
  vaultMetricsEntity.timestamps = _timestampsArray;
  vaultMetricsEntity.periodVsHoldAPRs = _periodVsHoldAPRs;
  vaultMetricsEntity.periodAsset1VsHoldAPRs = _periodAsset1VsHoldAPRs;
  vaultMetricsEntity.periodAsset2VsHoldAPRs = _periodAsset2VsHoldAPRs;
  vaultMetricsEntity.save();

  //===========vaultHistoryEntity(VaultEntity)===========//
  let _vaultHistoryEntity = vault.vaultHistoryEntity;
  if (_vaultHistoryEntity) {
    _vaultHistoryEntity.push(vaultHistoryEntity.id);
  } else {
    _vaultHistoryEntity = [];
    _vaultHistoryEntity.push(vaultHistoryEntity.id);
  }

  vault.vaultHistoryEntity = _vaultHistoryEntity;

  vault.lastAssetsSum = amountsSum.toString();
  vault.lastAssetsPrices = lastAssetsPrices;
  vault.save();
}
