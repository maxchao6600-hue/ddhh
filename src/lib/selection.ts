export type WeightedItem = {
  probability: number;
};

export function selectByTicket<T extends WeightedItem>(items: readonly T[], ticket: number): T {
  if (!Number.isInteger(ticket) || ticket < 0) {
    throw new Error("无效的随机数");
  }
  let cursor = 0;
  for (const item of items) {
    if (!Number.isInteger(item.probability) || item.probability < 0) {
      throw new Error("无效的概率");
    }
    cursor += item.probability;
    if (ticket < cursor) return item;
  }
  throw new Error("随机数超出概率区间");
}
