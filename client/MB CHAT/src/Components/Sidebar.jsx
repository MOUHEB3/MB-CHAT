import React, { useState, useEffect, useContext } from "react";
import "./myStyle.css";
import { IconButton } from "@mui/material";
import PersonAddSharpIcon from "@mui/icons-material/PersonAddSharp";
import ModeNightSharpIcon from "@mui/icons-material/ModeNightSharp";
import SearchSharpIcon from "@mui/icons-material/SearchSharp";
import ConversationsItem from "./ConversationsItem";
import { useNavigate } from "react-router-dom";
import LightModeIcon from "@mui/icons-material/LightMode";
import { useSelector, useDispatch } from "react-redux";
import { toggleTheme } from "../Features/themeSlice";
import axios from "axios";
import AccountMenu from "./Profile";
import Facebook from "./Skeleton";
import { RefreshContext } from "../App";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { Badge } from "antd";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Avatar from "@mui/material/Avatar";
import { ChatContext } from "../App";
import MarkChatUnreadSharpIcon from "@mui/icons-material/MarkChatUnreadSharp";
import empty from "./Images/empty2.png";
import socket from "../socket"; // Import your shared socket instance

export default function Sidebar() {
  const URL = process.env.REACT_APP_API_KEY;
  const lightTheme = useSelector((state) => state.themeKey);
  const [conversations, setConversations] = useState([]);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userName = localStorage.getItem("userName");
  const { MasterRefresh, notifications, setNotifications } =
    useContext(RefreshContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const { setChatInfo } = useContext(ChatContext);
  const [loading, setLoading] = useState(false);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  function bufferToImage(buffer) {
    const uint8Array = new Uint8Array(buffer.data);
    const binaryString = uint8Array.reduce(
      (acc, byte) => acc + String.fromCharCode(byte),
      ""
    );
    const base64String = btoa(binaryString);
    const imageSrc = `data:${buffer.type};base64,${base64String}`;
    return imageSrc;
  }

  /// handling notifications
  const removeNotification = (chatId) => {
    const updatedNotifications = notifications.filter(
      (notification) => notification.ChatId !== chatId
    );
    setNotifications(updatedNotifications);
  };

  const storeNotificationInLocalStorage = (notification) => {
    try {
      const modifiedNotification = {
        type: notification.type,
        content: notification.content,
        _id: notification.ChatId,
        name: notification.isGroupChat
          ? notification.ChatName
          : notification.sender,
        isGroup: notification.isGroupChat,
        otherUser: notification.senderId,
        otherUserImage: bufferToImage(notification.otherUserImage),
      };
      localStorage.setItem(
        "conversations",
        JSON.stringify(modifiedNotification)
      );
    } catch (error) {
      console.error("Error storing notification in local storage:", error);
    }
  };

  // Fetch conversations from API and filter out deleted ones
  useEffect(() => {
    setLoading(true);
    const fetchConversations = async () => {
      try {
        const response = await axios.get(`${URL}/chats/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setLoading(false);
        if (response.data.length === 0) {
          return;
        }
        const currentUserId = localStorage.getItem("userId");
        // Filter out chats where current user has soft-deleted them
        const activeChats = response.data.filter((chat) => {
          return !chat.deletedBy || !chat.deletedBy.includes(currentUserId);
        });

        const formattedConversations = activeChats.map((chat) => {
          const isGroupChat = chat.isGroupChat;
          let chatName = isGroupChat ? chat.chatName : "";
          if (!isGroupChat) {
            const otherUser =
              chat.users.find(
                (u) => u._id !== localStorage.getItem("userId")
              ) || chat.users[0];
            chatName = otherUser ? otherUser.name : "";
          }
          const lastMessage = chat.latestMessage
            ? chat.latestMessage.content
            : "";
          const timeStamp = chat.latestMessage
            ? chat.latestMessage.createdAt
            : "";
          const Image = chat.users
            .filter(
              (obj) =>
                obj._id !== localStorage.getItem("userId") && obj.image !== null
            )
            .map((obj) => obj.image)[0];

          return {
            _id: chat._id,
            name: chatName,
            lastMessage: lastMessage,
            timeStamp: timeStamp,
            isGroup: isGroupChat,
            otherUserImage: Image ? bufferToImage(Image) : null,
            otherUser: chat.users
              .filter((obj) => obj._id !== localStorage.getItem("userId"))
              .map((obj) => obj._id)[0],
          };
        });

        // Sort based on latest message timestamp
        formattedConversations.sort(
          (a, b) => new Date(b.timeStamp) - new Date(a.timeStamp)
        );
        setConversations(formattedConversations);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };

    fetchConversations();
  }, [MasterRefresh, URL]);

  // Listen for chatDeleted events to update the conversation list immediately
  useEffect(() => {
    const currentUserId = localStorage.getItem("userId");
    socket.on("chatDeleted", (data) => {
      // If the event indicates that the current user deleted the chat,
      // remove that conversation from the list immediately.
      if (data.userId === currentUserId) {
        setConversations((prevConversations) =>
          prevConversations.filter((conv) => conv._id !== data.chatId)
        );
      }
    });
    return () => {
      socket.off("chatDeleted");
    };
  }, []);
  

  // Filter conversations based on search term
  const filteredConversations = conversations.filter((conversation) =>
    conversation.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="sidebar-container">
      <div className={"sb-header" + (lightTheme ? "" : " dark")}>
        <div className="other-icons">
          <IconButton
            className="start-chat"
            onClick={() => navigate("start-chats")}
          >
            <MarkChatUnreadSharpIcon
              className={"icon" + (lightTheme ? "" : " dark")}
            />
          </IconButton>
          <IconButton onClick={() => navigate("users")}>
            <PersonAddSharpIcon
              className={"icon" + (lightTheme ? "" : " dark")}
            />
          </IconButton>
          <IconButton onClick={() => dispatch(toggleTheme())}>
            {lightTheme ? (
              <ModeNightSharpIcon
                className={"icon" + (lightTheme ? "" : " dark")}
              />
            ) : (
              <LightModeIcon
                className={"icon" + (lightTheme ? "" : " dark")}
              />
            )}
          </IconButton>
          <IconButton onClick={handleClick}>
            <Badge count={notifications.length}>
              <NotificationsIcon
                className={"icon" + (lightTheme ? "" : " dark")}
                sx={{ color: "#757575" }}
              />
            </Badge>
          </IconButton>
          <Menu
            id="basic-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              "aria-labelledby": "basic-button",
            }}
          >
            {notifications.length > 0 ? (
              notifications.map((notification, index) => (
                <MenuItem
                  key={index}
                  onClick={() => {
                    handleClose();
                    storeNotificationInLocalStorage(notification);
                    setChatInfo(
                      JSON.parse(localStorage.getItem("conversations")) || []
                    );
                    navigate("chat");
                    removeNotification(notification.ChatId);
                  }}
                >
                  <Avatar sx={{ width: 32, height: 32, marginRight: 1 }}>
                    {notification.isGroupChat
                      ? notification.ChatName[0]
                      : notification.sender[0]}
                  </Avatar>
                  {notification.isGroupChat
                    ? notification.ChatName
                    : notification.sender}
                  : {notification.content}
                </MenuItem>
              ))
            ) : (
              <MenuItem onClick={handleClose}>No new notifications</MenuItem>
            )}
          </Menu>
          <AccountMenu letter={userName[0]} />
        </div>
      </div>
      <div className={"sb-search" + (lightTheme ? "" : " dark")}>
        <IconButton className={"icon" + (lightTheme ? "" : " dark")}>
          <SearchSharpIcon />
        </IconButton>
        <input
          placeholder="search"
          className={"search-box" + (lightTheme ? "" : " dark")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className={"sb-conversations" + (lightTheme ? "" : " dark")}>
        {loading ? (
          <Facebook />
        ) : conversations.length === 0 ? (
          <img
            className="image-container"
            style={{ height: "40%", width: "100%" }}
            src={empty}
            alt="No conversations available"
          />
        ) : (
          filteredConversations.map((conversation) => (
            <ConversationsItem props={conversation} key={conversation._id} />
          ))
        )}
      </div>
    </div>
  );
}
