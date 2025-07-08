import { XStakingNotifyRewardHistoryEntity } from "../generated/schema";
import { NotifyReward as NotifyRewardEvent } from "../generated/templates/XSTBLData/XStakingABI";

export function handleNotifyReward(event: NotifyRewardEvent): void {
  const xStakingNotifyRewardHistoryEntity = new XStakingNotifyRewardHistoryEntity(
    event.transaction.hash
  );

  xStakingNotifyRewardHistoryEntity.timestamp = event.block.timestamp;
  xStakingNotifyRewardHistoryEntity.amount = event.params.amount;

  xStakingNotifyRewardHistoryEntity.save();
}
