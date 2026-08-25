import { get, set } from 'idb-keyval';

const QUEUE_KEY = 'hakika-rider-offline-queue';

export interface QueuedAction {
  id: string;
  type: 'arrive';
  orderId: string;
  payload: {
    gps_lat: number;
    gps_lon: number;
  };
  createdAt: number;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export const offlineQueue = {
  async getAll(): Promise<QueuedAction[]> {
    const data = await get<QueuedAction[]>(QUEUE_KEY);
    return data || [];
  },

  async enqueue(action: Omit<QueuedAction, 'id' | 'createdAt'>): Promise<void> {
    const queue = await this.getAll();
    queue.push({
      ...action,
      id: generateId(),
      createdAt: Date.now(),
    });
    await set(QUEUE_KEY, queue);
  },

  async peek(): Promise<QueuedAction | null> {
    const queue = await this.getAll();
    return queue.length > 0 ? queue[0] : null;
  },

  async dequeue(id: string): Promise<void> {
    const queue = await this.getAll();
    const updated = queue.filter((a) => a.id !== id);
    await set(QUEUE_KEY, updated);
  },

  async clear(): Promise<void> {
    await set(QUEUE_KEY, []);
  },

  async replayAll(replayFn: (action: QueuedAction) => Promise<void>): Promise<boolean> {
    const queue = await this.getAll();
    for (const action of queue) {
      try {
        await replayFn(action);
        await this.dequeue(action.id);
      } catch (e) {
        console.error('Replay failed for action', action.id, e);
        return false;
      }
    }
    return true;
  },
};
