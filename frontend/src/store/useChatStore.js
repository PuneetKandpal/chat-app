import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    let localMessages = [];
    try {
      const localMessagesString = localStorage.getItem(`chat_${userId}`);
      if (localMessagesString) {
        localMessages = JSON.parse(localMessagesString);
        set({ messages: localMessages }); // Show local messages immediately
        console.log("Local messages fetched", localMessages);
      }


      const latestMessageTime = localMessages.length > 0 ? localMessages[localMessages.length - 1].createdAt : null;

      let serverMessages = [];
      if (latestMessageTime) {

        // Fetch messages newer than the latest local message
        const res = await axiosInstance.get("/messages/time-filtered-messages", {
          params: { userId, time: latestMessageTime },
        });
        console.log("FilteredMessages fetched from server", res.data);
        serverMessages = res.data;

      } else {
        // Fetch all messages if no local messages or no timestamp
        const res = await axiosInstance.get(`/messages/all-messages/${userId}`);
        console.log("All messages fetched from server", res.data);
        serverMessages = res.data;
      }
      
      // Combine local and server messages, avoiding duplicates
      const combinedMessages = [...localMessages];

      const localMessageIds = new Set(localMessages.map(msg => msg._id));
      serverMessages.forEach(msg => {
        if (!localMessageIds.has(msg._id)) {
          combinedMessages.push(msg);
        }
      });
      
      // Sort messages by createdAt timestamp
      combinedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      set({ messages: combinedMessages });
      localStorage.setItem(`chat_${userId}`, JSON.stringify(combinedMessages));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
      // If server fetch fails but local messages exist, keep them.
      if(localMessages.length > 0 && get().messages.length === 0) {
        set({ messages: localMessages });
      }
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      const newMessage = res.data;
      const updatedMessages = [...messages, newMessage];
      set({ messages: updatedMessages });
      localStorage.setItem(`chat_${selectedUser._id}`, JSON.stringify(updatedMessages));
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return; // Ensure socket is available

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUserOrSelf = 
        newMessage.senderId === selectedUser._id || newMessage.receiverId === selectedUser._id;
      
      if (!isMessageSentFromSelectedUserOrSelf) return;
      
      // Ensure the message is relevant to the current chat
      const currentChatUserId = selectedUser._id;
      const messageInvolvesCurrentUser = newMessage.senderId === useAuthStore.getState().authUser._id || newMessage.receiverId === useAuthStore.getState().authUser._id;
      const messageBelongsToSelectedChat = (newMessage.senderId === currentChatUserId && newMessage.receiverId === useAuthStore.getState().authUser._id) || (newMessage.receiverId === currentChatUserId && newMessage.senderId === useAuthStore.getState().authUser._id);


      if (messageInvolvesCurrentUser && messageBelongsToSelectedChat) {
          const currentMessages = get().messages;
          // Avoid adding duplicate messages that might have been added via sendMessage optimistic update
          if (!currentMessages.find(msg => msg._id === newMessage._id)) {
            const updatedMessages = [...currentMessages, newMessage];
             // Sort messages by createdAt timestamp
            updatedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            set({ messages: updatedMessages });
            localStorage.setItem(`chat_${selectedUser._id}`, JSON.stringify(updatedMessages));
          }
      } else if (newMessage.senderId !== selectedUser._id && newMessage.senderId !== useAuthStore.getState().authUser._id) {
        // If message is from another user (not selected, not self), update their local storage for future
        const otherUserId = newMessage.senderId === useAuthStore.getState().authUser._id ? newMessage.receiverId : newMessage.senderId;
        const otherUserChatKey = `chat_${otherUserId}`;
        const otherUserLocalMessagesString = localStorage.getItem(otherUserChatKey);
        let otherUserLocalMessages = [];
        if (otherUserLocalMessagesString) {
            otherUserLocalMessages = JSON.parse(otherUserLocalMessagesString);
        }
        if (!otherUserLocalMessages.find(msg => msg._id === newMessage._id)) {
            otherUserLocalMessages.push(newMessage);
            otherUserLocalMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            localStorage.setItem(otherUserChatKey, JSON.stringify(otherUserLocalMessages));
        }
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
