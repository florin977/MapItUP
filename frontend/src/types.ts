export enum Page {
  Login,
  Admin,
  Guest,
}

export interface UploadActivity {
  floor: string;
  timestamp: number;
}

export type Day = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

// Each hour slot can have a string describing its status/event
export type Timetable = Record<Day, string[]>; 

export interface Room {
  id: number;
  name: string;
  floor: number;
}

export interface Building {
  id: number;
  name: string;
  lastUpdated: string;
  timetable: Timetable;
  rooms?: Room[];
}

export interface CampusEntrance {
  id: string;
  name: string;
  lat: number;
  lng: number;
}
