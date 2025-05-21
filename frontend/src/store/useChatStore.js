import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

const initialUnreadCounts = (() => {
  try {
    const storedCounts = localStorage.getItem('unreadCounts');
    if (storedCounts) {
      const parsedCounts = JSON.parse(storedCounts);
      // Basic validation: ensure it's an object
      if (typeof parsedCounts === 'object' && parsedCounts !== null && !Array.isArray(parsedCounts)) {
        return parsedCounts;
      }
    }
  } catch (e) {
    console.error("Failed to parse unreadCounts from localStorage on init:", e);
  }
  return {}; // Default to empty object if not found, parse error, or invalid structure
})();

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isSendingMessage: false,
  isUsersLoading: false,
  isMessagesLoading: false,
  usersTyping: new Set([""]),
  unreadCounts: initialUnreadCounts,
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      console.log("Fetching users");
      const res = await axiosInstance.get("/users/");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  searchUsers: async (query) => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/users/search", {
        params: { query },
      });
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

    set({ isSendingMessage: true });
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      const newMessage = res.data;
      const updatedMessages = [...messages, newMessage];
      set({ messages: updatedMessages });
      localStorage.setItem(`chat_${selectedUser._id}`, JSON.stringify(updatedMessages));
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSendingMessage: false });
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) {
      console.log("Socket not available for subscribing to messages.");
      return;
    }

    console.log("Attempting to subscribe to newMessage event.");

    socket.on("newMessage", (newMessage, ack) => {
      console.log("Raw newMessage received from socket:", JSON.stringify(newMessage, null, 2));
      console.log("Acknowledging message",JSON.stringify(ack, null, 2));
      ack({ status: "ok" }); // This matches what your server-side code expects

      const { selectedUser: currentSelectedUser, messages: currentStoreMessages } = get(); // Get fresh state
      const { authUser } = useAuthStore.getState();

      if (!authUser || !authUser._id) {
        console.warn("AuthUser not found or missing _id. Cannot process new message.");
        return;
      }

      if (!newMessage || typeof newMessage !== 'object' || !newMessage.senderId || !newMessage.receiverId || !newMessage._id) {
        console.warn("Received malformed newMessage object:", newMessage);
        return;
      }

      // Scenario 1: Message is for the currently selected chat
      if (currentSelectedUser && currentSelectedUser._id) {
        const isForSelectedChat =
          (newMessage.senderId === currentSelectedUser._id && newMessage.receiverId === authUser._id) ||
          (newMessage.receiverId === currentSelectedUser._id && newMessage.senderId === authUser._id);

        if (isForSelectedChat) {
          console.log("Processing message for currently selected user:", currentSelectedUser._id);
          if (!currentStoreMessages.find(msg => msg._id === newMessage._id)) {
            const updatedMessages = [...currentStoreMessages, newMessage];
            updatedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            set({ messages: updatedMessages });
            localStorage.setItem(`chat_${currentSelectedUser._id}`, JSON.stringify(updatedMessages));
            console.log("Updated messages state and localStorage for selected user.");
          } else {
            console.log("Duplicate message for selected user, not updating state.");
          }
          return; // Handled
        }
      }

      // Scenario 2: Message involves the authenticated user, but is not for the currently selected chat
      // (or no chat is selected). Update unread count for the other participant.
      const messageInvolvesAuthUser = newMessage.senderId === authUser._id || newMessage.receiverId === authUser._id;

      if (messageInvolvesAuthUser) {
        const otherParticipantId = newMessage.senderId === authUser._id ? newMessage.receiverId : newMessage.senderId;

        if (otherParticipantId === authUser._id) {
            console.log("Message is from/to authUser for a non-active self-chat. Not updating unread count.");
            return; // Avoids updating unread count for self-chat not currently active
        }

        console.log(`Message received for non-active chat with participant: ${otherParticipantId}. Incrementing unread count.`);
        set((state) => {
          const newUnreadCounts = {
            ...state.unreadCounts,
            [otherParticipantId]: (state.unreadCounts[otherParticipantId] || 0) + 1,
          };
          try {
            localStorage.setItem('unreadCounts', JSON.stringify(newUnreadCounts));
          } catch (e) {
            console.error("Failed to save unreadCounts to localStorage after increment:", e);
          }
          return { unreadCounts: newUnreadCounts };
        });
        console.log(`Incremented unread count for non-active chat with ${otherParticipantId}. Current counts from store:`, get().unreadCounts);
        return; // Message processed for unread count
      }

      console.log("Received message not involving authenticated user and not for selected chat. Ignoring.", JSON.stringify(newMessage, null, 2));
    });
    console.log("Subscribed to 'newMessage' event on socket.");
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },

  subscribeToStartTyping: ()=>{
    const socket = useAuthStore.getState().socket;
    if (!socket) return; // Ensure socket is available

    console.log("SUBSCRIBING TO START TYPING");
    socket.on("beginTyping", (typingData)=>{
      console.log("START TYPING DATA", typingData);
      set((state) => {
        const newUsersTyping = new Set(state.usersTyping);
        newUsersTyping.add(typingData.fromUserId);
        return { usersTyping: newUsersTyping };
      });
    });
  },

  unsubscribeFromStartTyping: ()=>{
    const socket = useAuthStore.getState().socket;
    socket.off("beginTyping");
  },

  subscribeToStopTyping: ()=>{
    const socket = useAuthStore.getState().socket;
    if (!socket) return; // Ensure socket is available
    console.log("SUBSCRIBING TO STOP TYPING");
    socket.on("endTyping", (typingData)=>{
      console.log("STOP TYPING DATA", typingData);
      set((state) => {
        const newUsersTyping = new Set(state.usersTyping);
        newUsersTyping.delete(typingData.fromUserId);
        return { usersTyping: newUsersTyping };
      });
    });
  },


  unsubscribeFromStopTyping: ()=>{
    const socket = useAuthStore.getState().socket;
    socket.off("endTyping");
  },

  emitStartTyping: (selectedUserId)=>{
    const fromUserId = useAuthStore.getState().authUser._id;
    const socket = useAuthStore.getState().socket;
    if (!socket) return; // Ensure socket is available

    socket.emit("startTyping", { fromUserId, toUserId: selectedUserId });
  },

  emitStopTyping: (selectedUserId)=>{
    const fromUserId = useAuthStore.getState().authUser._id;
    const socket = useAuthStore.getState().socket;
    if (!socket) return; // Ensure socket is available

    socket.emit("stopTyping", { fromUserId, toUserId: selectedUserId });
  },

  subscribeToMessageDelivered: ()=>{
    const socket = useAuthStore.getState().socket;
    if (!socket) return; // Ensure socket is available

    console.log("SUBSCRIBING TO MESSAGE DELIVERED");
    //deliveredAt: "2025-05-21T07:39:42.635Z"
    //messageId: "682d830fc0c71c07d560a72f"
    //receiverId: "682d828ac0c71c07d560a6cb"

    socket.on("messageDelivered", (messageData)=>{
      console.log("MESSAGE DELIVERED", messageData);
      const chatKey = `chat_${messageData.receiverId}`;
      const localMessagesString = localStorage.getItem(chatKey);
      console.log("Local messages string", localMessagesString);

      if(!localMessagesString) return;
      const localMessages = JSON.parse(localMessagesString);
      const updatedMessages = localMessages.map(msg => msg._id === messageData.messageId ? {...msg, deliveredAt: messageData.deliveredAt} : msg);

      console.log("Updated messages", updatedMessages);
      set({ messages: updatedMessages });
      localStorage.setItem(chatKey, JSON.stringify(updatedMessages));
    });
  },

  unsubscribeFromMessageDelivered: ()=>{
    const socket = useAuthStore.getState().socket;
    socket.off("messageDelivered");
  },
  
  setSelectedUser: (selectedUser) => {
    set({ selectedUser });
    if (selectedUser && selectedUser._id) {
      get().clearUnreadMessages(selectedUser._id);
    }
  },

  clearUnreadMessages: (userId) => {
    set((state) => {
      const newUnreadCounts = {
        ...state.unreadCounts,
        [userId]: 0,
      };
      try {
        localStorage.setItem('unreadCounts', JSON.stringify(newUnreadCounts));
      } catch (e) {
        console.error("Failed to save unreadCounts to localStorage after clear:", e);
      }
      return { unreadCounts: newUnreadCounts };
    });
    console.log(`Cleared unread messages count for user ${userId}. Current counts from store:`, get().unreadCounts);
  }
}));
