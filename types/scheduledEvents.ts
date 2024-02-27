export enum ScheduledEventType {
  GROUPWATCH = "groupwatch",
  GAMING = "gaming",
  GAMESHOW = "gameshow",
  OTHER = "other",
}

export type ScheduledEvent = {
  id: number;
  name: string;
  start: Date;
  end: Date;
  description: string;
  repeat: boolean;
  repeat_interval: number;
  type: ScheduledEventType;
  image?: string;
  imageUrl?: string;
  channel?: string;
  disabled: boolean;
  nextCheck?: Date;
  interested?: string[];
};
