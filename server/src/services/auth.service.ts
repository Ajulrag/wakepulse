import type { UserDocument } from "../types/database.js";
import { usersCollection } from "../config/collections.js";
import { hashPassword } from "../utils/password.js";
import type { RegisterInput } from "../validation/auth.js";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserDocument["role"];
  isActive: boolean;
  createdAt: Date;
}

export async function registerUser(
  input: RegisterInput,
): Promise<SafeUser> {
  const users = usersCollection();

  const existingUser = await users.findOne({
    email: input.email,
  });

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const now = new Date();

  const passwordHash = await hashPassword(input.password);

  const user: UserDocument = {
    name: input.name,
    email: input.email,
    passwordHash,
    role: "user",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await users.insertOne(user);

  return {
    id: result.insertedId.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}