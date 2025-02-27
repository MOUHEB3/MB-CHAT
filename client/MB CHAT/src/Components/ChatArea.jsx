import React, { useContext, useEffect } from "react";
import SingleChat from "./SingleChat";
import { ChatContext } from "../App";
import socket from "../socket";

export default function ChatArea() {
  // Destructure chatData and setChatData from context
  const { chatData, setChatData } = useContext(ChatContext);

  useEffect(() => {
    // Listener for real-time message deletion events
    const handleMessageDeleted = (data) => {
      // data contains: { messageId, chatId, userId }
      // Check if the deleted message belongs to the currently open chat
      if (chatData && chatData._id === data.chatId) {
        // If there is a messages array, filter out the deleted message
        if (chatData.messages) {
          const updatedMessages = chatData.messages.filter(
            (message) => message._id !== data.messageId
          );
          setChatData({ ...chatData, messages: updatedMessages });
        }
      }
    };

    socket.on("messageDeleted", handleMessageDeleted);

    // Clean up the listener on component unmount
    return () => {
      socket.off("messageDeleted", handleMessageDeleted);
    };
  }, [chatData, setChatData]);

  return (
    <div className="chatArea-container">
      <SingleChat chatData={chatData} />
    </div>
  );
}
