import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import Loader from "./icons/Loader";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage, emitStartTyping, emitStopTyping, selectedUser, isSendingMessage, usersTyping } =
    useChatStore();
  const typingTimeoutRef = useRef(null);


  //   HANDLE START TYPING
  const handleStartTyping = () => {
    if (selectedUser && !typingTimeoutRef.current) {
      emitStartTyping(selectedUser._id);
    }
  };

  //   HANDLE STOP TYPING
  const handleStopTyping = () => {
    if (selectedUser) {
      clearTimeout(typingTimeoutRef.current);
      emitStopTyping(selectedUser._id);
      typingTimeoutRef.current = null;
    }
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);

    // fires startTyping event if new text is not empty
    if (selectedUser) {
      if (newText.trim()) {
        handleStartTyping();
        clearTimeout(typingTimeoutRef.current); // Clear previous timeout
        typingTimeoutRef.current = setTimeout(() => {
          handleStopTyping();
        }, 1000); // Adjust timeout as needed (e.g., 1 second)
      } else {
        // If text is cleared, immediately stop typing
        handleStopTyping();
      }
    }
  };

  useEffect(() => {
    // Cleanup function to emit stop typing when component unmounts or selectedUser changes
    return () => {
      if (typingTimeoutRef.current) { // Check if there's an active timeout
        handleStopTyping();
      }
    };
  }, [selectedUser, emitStopTyping]); // Added emitStopTyping to dependencies

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // fires startTyping event if new text is not empty
    if (selectedUser) {
      if (file) {
        handleStartTyping();
        clearTimeout(typingTimeoutRef.current); // Clear previous timeout
        typingTimeoutRef.current = setTimeout(() => {
          handleStopTyping();
        }, 1000); // Adjust timeout as needed (e.g., 1 second)
      } else {
        // If text is cleared, immediately stop typing
        handleStopTyping();
      }
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (text.trim() === "") { 
      handleStopTyping();
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    handleStopTyping();

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="relative w-full p-4">
      {imagePreview && (
        <div className="flex items-center gap-2 mb-3">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="object-cover w-20 h-20 border rounded-lg border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      { usersTyping.has(selectedUser?._id) && <span className={`mx-4 my-1 animate-pulse absolute bottom-full left-0`}><span className="text-xs font-bold">{selectedUser?.fullName}</span><span className="text-xs font-normal">&nbsp;is typing...</span></span>}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex flex-1 gap-2">
          <input
            type="text"
            className="w-full rounded-lg input input-bordered input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={handleTextChange}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
            
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle
                     ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview || isSendingMessage}
        >
          {isSendingMessage ? <Loader className="size-5 animate-spin" /> : <Send size={20} />}
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
