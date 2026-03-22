import { Story as ApiStory } from "../lib/api";

export type StoryType =
  | "watch"
  | "list"
  | "rating"
  | "poll"
  | "hot_take"
  | "rewind"
  | "countdown"
  | "quiz"
  | "question_box";

export type StoryVisibility = "public" | "followers" | "close_friends";

export interface WatchContent {
  media_id: string;
  media_title: string;
  media_type: "movie" | "tv";
  poster_path?: string;
  note?: string;
  mentions?: { user_id: string; username: string }[];
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

export interface CountdownContent {
  media_id: string;
  media_title: string;
  release_date: string; // ISO date
  poster_path?: string;
  note?: string;
}

export interface QuizContent {
  question: string;
  options: { text: string }[];
  correct_index: number;
  media_id?: string;
  media_title?: string;
}

export interface QuestionBoxContent {
  question: string;
  media_id?: string;
  media_title?: string;
}

export type StoryContent =
  | WatchContent
  | ListContent
  | RatingContent
  | PollContent
  | HotTakeContent
  | RewindContent
  | CountdownContent
  | QuizContent
  | QuestionBoxContent;

export interface StorySlide {
  type: StoryType;
  content: StoryContent;
  imageUrl?: string | null;
  duration?: number; // seconds, default 8
}

export interface Story extends Omit<ApiStory, "content" | "slides"> {
  content: StoryContent;
  visibility?: StoryVisibility;
  slides?: StorySlide[] | null;
}

export interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
  onComplete?: () => void;
  readOnly?: boolean;
}

export interface Highlight {
  id: string;
  userId: string;
  name: string;
  coverImageUrl?: string | null;
  position: number;
  createdAt: string;
  previewStories?: Story[];
  storyCount?: number;
}
