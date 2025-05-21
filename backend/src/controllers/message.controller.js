import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";



export const getMessages = async (req, res) => {
  try {
    console.log("Get Message called")
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    // Update deliveredAt for messages received by the current user
    const now = new Date();
    const updatedMessagesPromises = messages.map(async (message) => {
      if (message.receiverId.equals(myId) && !message.deliveredAt) {
        message.deliveredAt = now;
        await message.save();
        // Notify the sender that the message has been delivered
        const senderSocketId = getReceiverSocketId(message.senderId.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageDelivered", {
            messageId: message._id,
            receiverId: message.receiverId,
            deliveredAt: now,
          });
        }
        return message; // Return the updated message
      }
      return message; // Return the original message if no update was needed
    });

    const updatedMessages = await Promise.all(updatedMessagesPromises);

    res.status(200).json(updatedMessages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getTimeFilteredMessages = async (req, res) => {
  try {
    const { userId, time } = req.query;
    const myId = req.user._id;

    console.log("userId", userId);
    console.log("time", time);

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userId },
        { senderId: userId, receiverId: myId },
      ],
      createdAt: { $gte: time },
    }).sort({ createdAt: 1 });

    // Update deliveredAt for messages received by the current user
    const now = new Date();
    const updatedMessagesPromises = messages.map(async (message) => {
      if (message.receiverId.equals(myId) && !message.deliveredAt) {
        message.deliveredAt = now;
        await message.save();
        // Notify the sender that the message has been delivered
        const senderSocketId = getReceiverSocketId(message.senderId.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageDelivered", {
            messageId: message._id,
            receiverId: message.receiverId,
            deliveredAt: now,
          });
        }
        return message; // Return the updated message
      }
      return message; // Return the original message if no update was needed
    });

    const updatedMessages = await Promise.all(updatedMessagesPromises);

    res.status(200).json(updatedMessages);
  } catch (error) {
    console.log("Error in getTimeFilterMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    console.log("senderId", senderId)
    console.log("receiverId", receiverId)

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    console.log("receiverSocketId", receiverSocketId)
    if (receiverSocketId) {
      io.timeout(1000).to(receiverSocketId).emit("newMessage", newMessage, async (err, ack) => {
        if (err) {
          // If err is not null, it means the ack timed out or there was an error
          console.log(`SERVER: No ACK received for message ${newMessage._id} to user ${receiverId} (socket ${receiverSocketId}). Error: ${err.message}`);
          return;
        }
        
        // ack will be the data sent by the client, e.g., { status: "ok" }
        // The 'ack' variable here is the second argument to the callback, after 'err'.
        console.log(`SERVER: ACK received for message ${newMessage._id} to user ${receiverId}. ACK data:`, ack);
        
        // This callback runs when the client acknowledges the message
        if (ack[0] && ack[0].status === "ok") { // Check ack.status directly
          newMessage.deliveredAt = new Date(); // Store the delivery timestamp
          await newMessage.save();
          console.log(`SERVER: Message ${newMessage._id} marked delivered to ${receiverId} at ${newMessage.deliveredAt}`);

          console.log("senderId", senderId)
          // Notify the sender that their message was just delivered
          const senderSocketId = getReceiverSocketId(senderId.toString()); // senderId is from sendMessage scope
          if (senderSocketId) {
            console.log("senderSocketId", senderSocketId)
            io.to(senderSocketId).emit("messageDelivered", {
              messageId: newMessage._id,
              receiverId, // Helps sender's client identify the chat
              deliveredAt: newMessage.deliveredAt,
            });
          }
        } else {
          // Optional: handle cases where acknowledgment is not 'ok'
          console.log(`SERVER: Message ${newMessage._id} to user ${receiverId} - acknowledgment received but status was not 'ok' or data malformed. ACK data:`, ack);
        }
      });
    } else {
      console.log(`SERVER: No active socket found for receiver user ${receiverId}. Message ${newMessage._id} not sent via socket in real-time for delivery confirmation.`);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
