import bcrypt from "bcrypt";
import { model, Schema } from "mongoose";

export const USER_ROLES = ["user", "admin", "super_admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const BAN_REASONS = [
  "spam",
  "abusive-behavior",
  "harassment",
  "fraud",
  "terms-violation",
  "security",
  "other",
] as const;
export type BanReason = (typeof BAN_REASONS)[number];

export interface IUserBan {
  isBanned: boolean;
  reason: BanReason;
  bannedAt: Date;
  sessionIps: string[];
}

export interface IUserProfileImage {
  url: string;
  publicId: string;
}

export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roles: string[];
  profileImage: IUserProfileImage | null;
  ban: IUserBan | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters long"],
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters long"],
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    roles: {
      type: [String],
      enum: USER_ROLES,
      default: ["user"],
    },
    profileImage: {
      type: new Schema<IUserProfileImage>(
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
    ban: {
      type: new Schema<IUserBan>(
        {
          isBanned: { type: Boolean, required: true, default: true },
          reason: { type: String, enum: BAN_REASONS, required: true },
          bannedAt: { type: Date, required: true, default: Date.now },
          sessionIps: { type: [String], default: [] },
        },
        { _id: false },
      ),
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = model<IUser>("User", userSchema);
