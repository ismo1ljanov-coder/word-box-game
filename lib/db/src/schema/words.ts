import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const levelEnum = pgEnum("level", ["A1", "A2", "B1", "B2", "C1", "C2"]);
export const gameTypeEnum = pgEnum("game_type", ["quiz", "crossword", "flashcard", "matching", "spelling", "daily_challenge", "anagram", "speed_quiz"]);

export const wordsTable = pgTable("words", {
  id: serial("id").primaryKey(),
  word: text("word").notNull(),
  translation: text("translation").notNull(),
  level: levelEnum("level").notNull(),
  category: text("category").notNull(),
  partOfSpeech: text("part_of_speech"),
  exampleSentence: text("example_sentence"),
  exampleTranslation: text("example_translation"),
  phonetic: text("phonetic"),
});

export const wordProgressTable = pgTable("word_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  wordId: integer("word_id").notNull().references(() => wordsTable.id),
  learned: boolean("learned").notNull().default(false),
  practiceCount: integer("practice_count").notNull().default(0),
  score: integer("score").notNull().default(0),
  isFavorite: boolean("is_favorite").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const gameSessionsTable = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  gameType: gameTypeEnum("game_type").notNull(),
  level: levelEnum("level").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").notNull(),
  coinsEarned: integer("coins_earned").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWordSchema = createInsertSchema(wordsTable).omit({ id: true });
export const insertWordProgressSchema = createInsertSchema(wordProgressTable).omit({ id: true, updatedAt: true });
export const insertGameSessionSchema = createInsertSchema(gameSessionsTable).omit({ id: true, createdAt: true });

export type Word = typeof wordsTable.$inferSelect;
export type InsertWord = z.infer<typeof insertWordSchema>;
export type WordProgress = typeof wordProgressTable.$inferSelect;
export type GameSession = typeof gameSessionsTable.$inferSelect;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
