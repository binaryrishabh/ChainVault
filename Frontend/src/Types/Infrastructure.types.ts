export interface Infrastructure {
  id: string;
  userId: string;
  name: string;
  layout: {
    icons: Icons
  };
  createdAt: string;
  updatedAt: string;
}

type Icons = Array<{
  id: string,
  type: string,
  emoji: string,
  x: number,
  y: number
}>