export type ExchangeType = {
  id: number;
  name: string;
  theme: string | undefined;
  description: string;
  start: Date | number;
  end: Date | number;
  registerAccepted: boolean;
}

export type ExchangeUserType = {
  id: number;
  userId: string;
  exchangeId: number;
  pair: string | undefined;
  suggestions: string | undefined;
  preferences: string | undefined;
}