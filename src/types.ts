export interface User {
  id: number;
  username: string;
  role: 'admin' | 'student';
  photoUrl: string | null;
  fullname?: string;
  nickname?: string;
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
export interface GameState {
  users: User[];
  items: Item[];
  abilities: Ability[];
  userItems: UserItem[];
  userAbilities: UserAbility[];
  userEffects: UserEffect[];
  logs: Log[];
  onlineUserIds: number[];
}
