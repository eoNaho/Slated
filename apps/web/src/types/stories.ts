import { Story as ApiStory } from "../lib/api";

export type StoryType = "watch" | "list" | "rating" | "poll" | "hot_take" | "rewind";

export interface WatchContent {
  media_id: string;
  media_title: string;
  media_type: "movie" | "tv";
  poster_path?: string;
  note?: string;
}

export interface ListContent {
  list_id: string;
  list_name: string;
  item_count: number;
  preview_images: string[];
}

export interface RatingContent {
  media_id: string;
  media_title: string;
  media_type: "movie" | "tv";
  rating: number;
  text?: string;
  poster_path?: string;
}

export interface PollContent {
  question: string;
  options: { text: string }[];
}

export interface HotTakeContent {
  statement: string;
  background_color?: string; // hex or gradient name
}

export interface RewindContent {
  date: string;
  year: number;
  media_watched: {
    id: string;
    title: string;
    poster_path: string;
    type: "movie" | "tv";
  }[];
  top_genre?: string;
}

export type StoryContent = 
  | WatchContent 
  | ListContent 
  | RatingContent 
  | PollContent 
  | HotTakeContent 
  | RewindContent;

export interface Story extends Omit<ApiStory, "content"> {
  content: StoryContent;
}

export interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
  onComplete?: () => void;
}
