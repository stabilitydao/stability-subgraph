import {
  afterEach,
  assert,
  clearStore,
  describe,
  test,
} from "matchstick-as/assembly/index";
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as";

import { NotifyReward } from "../generated/XStakingData/XStakingABI";
import { handleNotifyReward } from "../src/XStakingSonic";

const TRANSACTION_HASH =
  "0xe6ef50c2f9a42afb20cfad54b02cee98bd7c19564c5c497bcc030de0a853eaaf";

function createNotifyRewardEvent(
  from: Address,
  amount: BigInt,
  timestamp: BigInt
): NotifyReward {
  const event = changetype<NotifyReward>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  );
  event.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  );
  event.block.timestamp = timestamp;
  event.transaction.hash = Bytes.fromHexString(TRANSACTION_HASH);

  return event;
}

describe("XStaking NotifyReward", () => {
  afterEach(() => {
    clearStore();
  });

  test("stores the raw reward amount and block timestamp", () => {
    const event = createNotifyRewardEvent(
      Address.fromString("0x23b8cc22c4c82545f4b451b11e2f17747a730810"),
      BigInt.fromString("136251432994987656534908"),
      BigInt.fromI32(1743652558)
    );

    handleNotifyReward(event);

    assert.entityCount("XStakingNotifyRewardHistoryEntity", 1);
    assert.fieldEquals(
      "XStakingNotifyRewardHistoryEntity",
      TRANSACTION_HASH,
      "timestamp",
      "1743652558"
    );
    assert.fieldEquals(
      "XStakingNotifyRewardHistoryEntity",
      TRANSACTION_HASH,
      "amount",
      "136251432994987656534908"
    );
  });

  test("preserves transaction-level last-event semantics", () => {
    const firstEvent = createNotifyRewardEvent(
      Address.fromString("0x902215dd96a291b256a3aef6c4dee62d2a9b80cb"),
      BigInt.fromString("51758625498654720000"),
      BigInt.fromI32(1743652558)
    );
    const lastEvent = createNotifyRewardEvent(
      Address.fromString("0x23b8cc22c4c82545f4b451b11e2f17747a730810"),
      BigInt.fromString("136251432994987656534908"),
      BigInt.fromI32(1743652558)
    );

    handleNotifyReward(firstEvent);
    handleNotifyReward(lastEvent);

    assert.entityCount("XStakingNotifyRewardHistoryEntity", 1);
    assert.fieldEquals(
      "XStakingNotifyRewardHistoryEntity",
      TRANSACTION_HASH,
      "amount",
      "136251432994987656534908"
    );
  });
});
