export type Event = {
  id: string;
  title: string;
  date: string;
  location: string;
  link: string;
  isVisible?: boolean;
  isNew?: boolean;
  source?: string;
  venue?: string;
};
