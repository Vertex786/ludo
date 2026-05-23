export type PlayerColor = "red" | "green" | "yellow" | "blue";

export interface Player {
  id: string;
  color: PlayerColor;
  tokens: number[];
  hasFinished: boolean;
  latestMessage?: string;
  lastDiceValue?: number | null;
}

export interface Room {
  id: string;
  name: string;
  maxPlayers: number;
  players: Player[];
  activeColor: PlayerColor;
  diceValue: number | null;
  diceRolled: boolean;
  gameState: "waiting" | "playing" | "finished";
  sixCount?: number;
  turnEndTime?: number;
}
