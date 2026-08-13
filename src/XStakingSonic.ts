import { XStakingNotifyRewardHistoryEntity } from "../generated/schema";
import { NotifyReward as NotifyRewardEvent } from "../generated/XStakingData/XStakingABI";

export function handleNotifyReward(event: NotifyRewardEvent): void {
  // Keep the existing transaction-level identity used by host-agent revenue
  // history. Some reward transactions emit more than one NotifyReward event;
  // the final event in the transaction is the value exposed by the current API.
  const reward = new XStakingNotifyRewardHistoryEntity(event.transaction.hash);

  reward.timestamp = event.block.timestamp;
  reward.amount = event.params.amount;

  reward.save();
}
