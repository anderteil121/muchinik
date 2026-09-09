export interface User {
  id: number;
  username: string;
  role: 'admin' | 'student';
  photoUrl: string | null;
}

export interface Item {
  id: number;
  name: string;
  description: string;
}

export interface Ability {
  id: number;
  name: string;
  description: string;
  type: 'passive' | 'active';
  target: 'self' | 'ally';
  cooldown: number;
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
  logs: Log[];
}
