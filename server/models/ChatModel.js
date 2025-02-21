import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema({
  message: String,
  response: String,
  timestamp: { type: Date, default: Date.now },
});

const ChatModel = mongoose.model("Chat", ChatSchema);
export default ChatModel;
