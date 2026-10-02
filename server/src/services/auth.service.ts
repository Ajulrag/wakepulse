import type { UserDocument } from "../types/database.js";
import { usersCollection } from "../config/collections.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import type { RegisterInput, LoginInput } from "../validation/auth.js";
import { ObjectId } from "mongodb";

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

export async function authenticateUser(
  input: LoginInput,
): Promise<SafeUser> {
  const users = usersCollection();

  const user = await users.findOne({
    email: input.email,
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new Error("ACCOUNT_DISABLED");
  }

  const passwordMatches = await comparePassword(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!user._id) {
    throw new Error("INVALID_USER_ID");
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}