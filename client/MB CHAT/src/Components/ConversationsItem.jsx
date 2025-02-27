import React, { useContext, useState, useEffect } from "react";
import "./myStyle.css";
import { useNavigate } from "react-router-dom";
import { ChatContext } from "../App";
import Avatar from "@mui/material/Avatar";
import { RefreshContext } from "../App";
import Badge from "@mui/material/Badge";
import { useSelector } from "react-redux";
import socket from "../socket";

function ConversationsItem({ props }) {
  const [entryCount, setEntryCount] = useState(0);
  const [visible, setVisible] = useState(true);
  const [forceRemountKey, setForceRemountKey] = useState(0);

  const lightTheme = useSelector((state) => state.themeKey);
  const navigate = useNavigate();
  const { setChatInfo, onlineUsers } = useContext(ChatContext);
  const { notifications, setNotifications } = useContext(RefreshContext);

  const iconName = props.name ? props.name[0] : "";
  const title = props.name || "";
  const lastMessage = props.lastMessage || "start a new chat";
  const otherUserImage = props.otherUserImage;

  // Update notification count for this conversation
  useEffect(() => {
    let count = 0;
    notifications.forEach((notification) => {
      if (notification.ChatId === props._id) {
        count++;
      }
    });
    setEntryCount(count);
  }, [notifications, props._id]);

  // Listen for real-time chat deletion
  useEffect(() => {
    const handleChatDeleted = (data) => {
      if (data.chatId === props._id) {
        setVisible(false);
      }
    };
    socket.on("chatDeleted", handleChatDeleted);
    return () => {
      socket.off("chatDeleted", handleChatDeleted);
    };
  }, [props._id]);

  // Listen for new messages that belong to this conversation
  useEffect(() => {
    const handleNewMessage = (data) => {
      if (data.chat && data.chat._id === props._id) {
        setForceRemountKey((prev) => prev + 1);
      }
    };
    socket.on("new message", handleNewMessage);
    return () => {
      socket.off("new message", handleNewMessage);
    };
  }, [props._id]);

  if (!visible) return null;

  // Calculate latest notification content for this conversation
  const latestNotification = notifications.reduce((latest, notification) => {
    if (notification.ChatId === props._id && (!latest || notification.timeStamp > latest.timeStamp)) {
      return notification;
    }
    return latest;
  }, null);
  const notificationContent = latestNotification
    ? latestNotification.isGroupChat
      ? `${latestNotification.sender}:${latestNotification.content}`
      : latestNotification.content
    : null;

  const handleClick = () => {
    localStorage.setItem("conversations", JSON.stringify(props));
    setChatInfo(JSON.parse(localStorage.getItem("conversations")) || []);
    setNotifications(notifications.filter((notification) => notification.ChatId !== props._id));
    navigate("/app/chat");
  };

  return (
    <div key={forceRemountKey} className="conversation-container" onClick={handleClick}>
      {otherUserImage && !props.isGroup ? (
        <Avatar
          className="con-icon"
          sx={{
            width: 52,
            height: 52,
            borderRadius: 15,
            border: onlineUsers.has(props.otherUser) ? "2px solid green" : undefined,
          }}
          src={otherUserImage}
        />
      ) : (
        <p className="con-icon">{iconName}</p>
      )}

      <p className="con-title" style={{ color: lightTheme ? "black" : "white" }}>
        {title}
      </p>
      <p className="con-lastMessage" style={{ color: lightTheme ? "black" : "white" }}>
        {notificationContent || lastMessage}
      </p>
      <p className="con-timeStamp" style={{ color: lightTheme ? "black" : "white" }}>
        <Badge badgeContent={entryCount} color="success" />
      </p>
    </div>
  );
}

export default ConversationsItem;
