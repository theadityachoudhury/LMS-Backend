//function to hash the password using bcrypt using a salt of 10 rounds
import bcrypt from 'bcrypt';

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}
