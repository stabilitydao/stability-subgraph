import { PriceUpdated } from '../generated/VaultPriceOracleData/VaultPriceOracleABI';
import { PriceHistoryEntity } from '../generated/schema';

export function handlePriceUpdated(event: PriceUpdated): void {
  const id = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  const priceHistory = new PriceHistoryEntity(id);
  priceHistory.price = event.params.price;
  priceHistory.vault = event.params.vault;
  priceHistory.round = event.params.roundId;
  priceHistory.timestamp = event.params.timestamp;
  priceHistory.save();
}