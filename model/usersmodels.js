import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    userName: {
      type: String,
      required: true,
      trim: true
    },
    phoneNumber: {
      type: String,   // <-- Important fix
      required: true
    },
    profilepic: {
      type: String,
      default: ""     // <-- Not required
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["user", "admin", "manager"],
      default: "user"
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
