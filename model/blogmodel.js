import mongoose from "mongoose";

const BlogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  user: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",   // reference to user model
      required: true
    },
    name: {
      type: String,
      required: true
    }
  }
}, { timestamps: true });

export default mongoose.model("Blog", BlogSchema);
