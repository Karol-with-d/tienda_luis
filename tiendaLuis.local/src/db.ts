import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");

export function readJSON<T>(file: string): T {
  const full = path.join(DATA_DIR, file);
  return JSON.parse(fs.readFileSync(full, "utf-8")) as T;
}

export function writeJSON<T>(file: string, data: T): void {
  const full = path.join(DATA_DIR, file);
  fs.writeFileSync(full, JSON.stringify(data, null, 2), "utf-8");
}