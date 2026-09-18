export interface User {
  id: number;
  username: string;
  role: 'admin' | 'student';
  photoUrl: string | null;
  fullname?: string;
  nickname?: string;
  balance?: number;
}
export interface Item {
  id: number;
  name: string;
  description: string;
  iconUrl?: string;
  isStackable?: boolean;
  target?: 'self' | 'ally';
  duration?: number;
}
export interface Ability {
  id: number;
  name: string;
  description: string;
  type: 'passive' | 'active';
  target: 'self' | 'ally';
  cooldown: number;
  iconUrl?: string;
  successChance?: number;
  duration?: number;
  isStackable?: boolean;
  chancesJson?: string;
}
export interface UserItem {
  id: number;
  userId: number;
  itemId: number;
}
export interface UserAbility {
  id: number;
  userId: number;
  abilityId: number;
  lastUsedAt: number;
}
export interface UserEffect {
  id: number;
  userId: number;
  abilityId?: number;
  itemId?: number;
  appliedAt: number;
  expiresAt: number;
  stacks?: number;
}
export interface Log {
  id: number;
  message: string;
  createdAt: number;
}
export interface MarketItem {
  id: number;
  itemId: number;
  price: number;
  stock?: number;
  createdAt?: number;
}
export interface Quest {
  id: number;
  title: string;
  description: string;
  rewardCoins: number;
  rewardItemId?: number | null;
  rewardAbilityId?: number | null;
  maxAccepts: number; // -1 for unlimited, or positive number
  createdAt: number;
  createdByAdminId?: number | null;
}
export interface UserQuest {
  id: number;
  userId: number;
  questId: number;
  status: 'active' | 'completed' | 'cancelled';
  acceptedAt: number;
  completedAt?: number | null;
}
export interface GameState {
  users: User[];
  items: Item[];
  abilities: Ability[];
  userItems: UserItem[];
  userAbilities: UserAbility[];
  userEffects: UserEffect[];
  logs: Log[];
  onlineUserIds: number[];
  marketItems: MarketItem[];
  quests: Quest[];
  userQuests: UserQuest[];
}
