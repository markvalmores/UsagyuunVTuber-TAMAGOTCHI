
export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum UsagyuuunState {
  IDLE = 'IDLE',
  TALKING = 'TALKING',
  LISTENING = 'LISTENING',
  EXCITED = 'EXCITED'
}

export interface AudioConfig {
  sampleRate: number;
  numChannels: number;
}
