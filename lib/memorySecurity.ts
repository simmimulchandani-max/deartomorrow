import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashMemoryPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyMemoryPassword(password: string, storedHash: string) {
  const [salt, storedDerivedKey] = storedHash.split(":");

  if (!salt || !storedDerivedKey) {
    return false;
  }

  const passwordBuffer = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(storedDerivedKey, "hex");

  if (passwordBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(passwordBuffer, storedBuffer);
}
