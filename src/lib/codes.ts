import { randomInt } from "node:crypto";

// Alphabet lisible : pas de 0/O ni de 1/l/I pour éviter les confusions à l'oral/à l'écrit.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

export function generateGroupCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

export function normalizeGroupCode(input: string): string {
  return input.trim().toUpperCase();
}
