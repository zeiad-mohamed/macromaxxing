// Password hashing. bcryptjs is pure JavaScript, so there is no native build
// to break on any host.
import bcrypt from "bcryptjs";

const ROUNDS = 10;

export function hashPassword(password) {
  return bcrypt.hashSync(password, ROUNDS);
}

export function verifyPassword(password, passwordHash) {
  // When the user is unknown, callers pass nothing: comparing against a
  // fixed dummy hash keeps timing roughly constant. A malformed hash throws
  // in bcryptjs, so any throw just means "no match".
  try {
    return bcrypt.compareSync(
      password,
      passwordHash ?? "$2a$10$abcdefghijklmnopqrstuv0123456789012345678901234567890123",
    );
  } catch {
    return false;
  }
}
