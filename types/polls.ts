export type PollType = {
  id: number;
  title: string;
  description: string;
  start: Date | number;
  end: Date | number;
  channel: string;
  message: string;
};

export type PollOptionType = {
  id: number;
  pollId: number;
  name: string;
  indexNum: number;
};