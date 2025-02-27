import React, { useEffect, useState, useContext, useRef } from "react";
import { IconButton, Button, Alert, AlertTitle } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import MessageOthers from "./MessageOthers";
import SelfMessage from "./SelfMessage";
import "./myStyle.css";
import axios from "axios";
import io from "socket.io-client";
import { Modal } from "antd";
import { MessageSkeleton } from "./Skeleton";
import LogoutIcon from "@mui/icons-material/Logout";
import Members from "./Members";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useNavigate } from "react-router-dom";
import { RefreshContext, ChatContext } from "../App";
import { Ring, Chatsound } from "./Sounds/PlaySounds";
import EmojiPicker from "emoji-picker-react";
import Facebook from "./Skeleton";
import AddReactionSharpIcon from "@mui/icons-material/AddReactionSharp";
import ClearSharpIcon from "@mui/icons-material/ClearSharp";
import Avatar from "@mui/material/Avatar";
import Typing from "./Typing";
import { SendingMsg, bufferToImage } from "./Utils";
import { useSelector } from "react-redux";
import AddIcon from "@mui/icons-material/Add";
import AddMember from "./AddMember";
import DeleteIcon from "@mui/icons-material/Delete";
import SelectAllIcon from "@mui/icons-material/SelectAll";

const URL = process.env.REACT_APP_API_KEY;
let socket;

export default function SingleChat() {
  const [messageContent, setMessageContent] = useState("");
  const userId = localStorage.getItem("userId");
  const [allMessagesCopy, setAllMessagesCopy] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupData, setGroupData] = useState(null);
  const [open, setOpen] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const { MasterRefresh, setMasterRefresh, setNotifications } = useContext(RefreshContext);
  const [otherUsersTyping, setOtherUsersTyping] = useState([]);
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [viewEmoji, setViewEmoji] = useState(false);
  const { onlineUsers, setOnlineUsers, ChatInfo, setChatInfo } = useContext(ChatContext);
  const [groupLoading, setGroupLoading] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const lightTheme = useSelector((state) => state.themeKey);
  const [messageLoadingContent, setmessageLoadingcontent] = useState([""]);
  const [showAlert, setShowalert] = useState(false);
  const scrollableDivRef = useRef(null);

  // New state for selection mode and selected messages
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);

  // Toggle selection for a message
  const toggleSelection = (messageId) => {
    setSelectedMessages((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    );
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedMessages.length === 0) return;
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(
        `${URL}/message/bulk`,
        { data: { messageIds: selectedMessages }, ...config }
      );
      setAllMessagesCopy((prevMessages) =>
        prevMessages.filter((msg) => !selectedMessages.includes(msg._id))
      );
      setSelectedMessages([]);
      setSelectionMode(false);
    } catch (error) {
      console.error("Error bulk deleting messages:", error);
    }
  };

  // If ChatInfo is empty, try to load from local storage
  useEffect(() => {
    if (Object.keys(ChatInfo).length === 0 && localStorage.getItem("conversations")) {
      setChatInfo(JSON.parse(localStorage.getItem("conversations")) || []);
    }
  }, [ChatInfo, setChatInfo]);

  if (!localStorage.getItem("conversations")) {
    navigate("/app/welcome");
  }

  useEffect(() => {
    setAllMessagesCopy([]);
    // Reset messages when component mounts
  }, []);

  // Delete Chat handler: calls the delete endpoint to clear the chat for you
  const handleDeleteChat = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${URL}/chats/${ChatInfo._id}`, config);

      setMasterRefresh((prev) => !prev);
      setChatInfo({});
      navigate("/app/welcome");
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  const handleTyping = () => {
    if (!typing) {
      setTyping(true);
      socket.emit("typing", ChatInfo._id);
    }
  };

  const handleStopTyping = () => {
    if (typing) {
      setTyping(false);
      socket.emit("stop typing", ChatInfo._id);
    }
  };

  const handleClickOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const showModal = () => setIsModalOpen(true);
  const handleOk = () => setIsModalOpen(false);
  const handleCancel = () => setIsModalOpen(false);

  const scrollDown = () => {
    if (scrollableDivRef.current) {
      scrollableDivRef.current.scrollTop = scrollableDivRef.current.scrollHeight;
    }
  };

  const sendMessage = () => {
    setSendingMsg(true);
    setShowalert(false);
    const token = localStorage.getItem("token");
    setmessageLoadingcontent(messageContent);

    if (!token) {
      console.error("No token found.");
      setSendingMsg(false);
      return;
    }

    const config = { headers: { Authorization: `Bearer ${token}` } };

    axios
      .post(
        `${URL}/message/`,
        { content: messageContent, chatId: ChatInfo._id },
        config
      )
      .then(({ data }) => {
        socket.emit("new message", data);
        setSendingMsg(false);
        setAllMessagesCopy((prevMessages) => [...prevMessages, data]);
        scrollDown();
        setMessageContent("");
      })
      .catch((error) => {
        console.error("Error sending message:", error);
        setSendingMsg(false);
        setShowalert(true);
        scrollDown();
      });
  };

  // Connecting to socket
  useEffect(() => {
    socket = io(URL);
    socket.emit("setup", userId);
    socket.on("connected", () => {});
    socket.on("user online", (uId) => {
      setOnlineUsers((prevUsers) => new Set([...prevUsers, uId]));
    });
    socket.on("user offline", (uId) => {
      setOnlineUsers((prevUsers) => {
        const newUsers = new Set(prevUsers);
        newUsers.delete(uId);
        return newUsers;
      });
    });
  }, [setOnlineUsers, userId]);

  // New message received
  useEffect(() => {
    const handleNewMessage = (newMessage) => {
      if (ChatInfo._id === newMessage.chat._id) {
        Ring();
        scrollDown();
      }
      if (!allMessagesCopy.length || allMessagesCopy[0]._id !== newMessage._id) {
        if (newMessage.chat._id === ChatInfo._id) {
          setAllMessagesCopy((prevMessages) => [...prevMessages, newMessage]);
        }
        if (ChatInfo._id !== newMessage.chat._id) {
          setNotifications((prevNotifications) => [
            ...prevNotifications,
            {
              type: "message",
              content: newMessage.content,
              sender: newMessage.sender.name,
              isGroupChat: newMessage.chat.isGroupChat,
              ChatId: newMessage.chat._id,
              ChatName: newMessage.chat.chatName,
              senderId: newMessage.sender._id,
              timeStamp: new Date().toISOString(),
              otherUserImage: newMessage.chat.users
                .filter(
                  (obj) =>
                    obj._id !== localStorage.getItem("userId") && obj.image !== null
                )
                .map((obj) => obj.image)[0],
            },
          ]);
          Chatsound();
        }
      }
    };
    socket.on("message received", handleNewMessage);
    return () => {
      socket.off("message received", handleNewMessage);
    };
  }, [allMessagesCopy, userId, ChatInfo._id, setNotifications]);

  // Listen for "messageDeleted" events and remove the deleted message
  useEffect(() => {
    const handleMessageDeleted = (data) => {
      if (ChatInfo._id === data.chatId) {
        setAllMessagesCopy((prevMessages) =>
          prevMessages.filter((message) => message._id !== data.messageId)
        );
      }
    };

    socket.on("messageDeleted", handleMessageDeleted);

    return () => {
      socket.off("messageDeleted", handleMessageDeleted);
    };
  }, [ChatInfo._id]);

  // Fetch messages for this chat
  useEffect(() => {
    setLoading(true);
    if (ChatInfo._id) {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };

      axios
        .get(`${URL}/message/${ChatInfo._id}`, config)
        .then(({ data }) => {
          if (data.length === 0) {
            setLoading(false);
            setAllMessagesCopy([]);
            socket.emit("join chat", ChatInfo._id);
            return;
          }
          if (!data[0].chat.users.includes(userId)) {
            navigate("/app/welcome");
          }
          setAllMessagesCopy(data);
          socket.emit("join chat", ChatInfo._id);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching messages:", error);
          setLoading(false);
        });
    }
  }, [navigate, ChatInfo._id, userId]);

  // Fetch group info
  useEffect(() => {
    setGroupLoading(true);
    const fetchData = async () => {
      try {
        if (!ChatInfo.isGroup) {
          setGroupLoading(false);
          return;
        }
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No token found.");
          setGroupLoading(false);
          return;
        }
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        };
        const groupId = ChatInfo._id;
        const response = await fetch(`${URL}/chats/groupInfo`, {
          method: "POST",
          headers: config.headers,
          body: JSON.stringify({ groupId }),
        });
        if (!response.ok) {
          setGroupLoading(false);
          console.error("Error fetching group info:", response.statusText);
          return;
        }
        const data = await response.json();
        setGroupData(data);
        setGroupLoading(false);
        const isUserInGroup =
          data &&
          data.userMappings.some(
            (userMapping) => userMapping.userId === userId
          );
        if (!isUserInGroup) {
          navigate("/app/welcome");
          window.alert("Unauthorized action detected");
        }
      } catch (error) {
        setGroupLoading(false);
        console.error("Error fetching group info:", error);
      }
    };
    fetchData();
  }, [ChatInfo.isGroup, ChatInfo._id, navigate, userId]);

  // Exit group chat
  const exitGroupChat = async () => {
    const url = `${URL}/chats/groupExit`;
    const headers = {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
    };
    const data = { chatId: ChatInfo._id, userId };
    try {
      await axios.put(url, data, { headers });
      navigate("/app/welcome");
      setMasterRefresh(!MasterRefresh);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Listen for "typing" event from other users
  useEffect(() => {
    socket.on("typing", (room) => {
      if (room === ChatInfo._id) {
        setOtherUsersTyping((prevTyping) => {
          if (!prevTyping.includes(room)) {
            return [...prevTyping, room];
          }
          return prevTyping;
        });
      }
    });
    socket.on("stop typing", (room) => {
      if (room === ChatInfo._id) {
        setOtherUsersTyping((prevTyping) =>
          prevTyping.filter((id) => id !== room)
        );
      }
    });
    return () => {
      socket.off("typing");
      socket.off("stop typing");
    };
  }, [ChatInfo._id]);

  return (
    <>
      <div
        className={"chatArea-header" + (lightTheme ? "" : " dark")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <IconButton onClick={ChatInfo.isGroup ? showModal : null}>
            {ChatInfo.otherUserImage && !ChatInfo.isGroup ? (
              <Avatar
                className="con-icon"
                sx={{ width: 52, height: 52, borderRadius: 15 }}
                src={ChatInfo.otherUserImage}
              />
            ) : (
              <p className="con-icon">{ChatInfo.name && ChatInfo.name[0]}</p>
            )}
          </IconButton>
          <div className="header-text">
            <p
              className="con-title"
              style={{
                color: lightTheme ? "black" : "white",
                display: "flex",
                alignItems: "center",
              }}
            >
              {ChatInfo.name}
              {/* Delete Chat button */}
              <IconButton
                onClick={handleDeleteChat}
                title="Delete Chat"
                size="small"
              >
                <DeleteIcon
                  style={{
                    color: "red",
                    marginLeft: "0.5rem",
                    fontSize: "1rem",
                  }}
                />
              </IconButton>
              {/* Toggle selection mode button */}
              <IconButton
                onClick={() => {
                  setSelectionMode((prev) => !prev);
                  setSelectedMessages([]);
                }}
                title={selectionMode ? "Cancel selection" : "Select messages"}
                size="small"
              >
                <SelectAllIcon
                  style={{
                    color: selectionMode ? "red" : lightTheme ? "black" : "white",
                    marginLeft: "0.5rem",
                    fontSize: "1rem",
                  }}
                />
              </IconButton>
            </p>
            <p style={{ color: lightTheme ? "black" : "white" }}>
              {onlineUsers.has(ChatInfo.otherUser) && !ChatInfo.isGroup
                ? "online"
                : null}
            </p>
          </div>
        </div>
        <div className="header-actions">
          {ChatInfo.isGroup && (
            <IconButton onClick={handleClickOpen}>
              <LogoutIcon />
            </IconButton>
          )}
        </div>
      </div>

      {/* Bulk delete button (visible when selection mode is active) */}
      {selectionMode && (
        <div style={{ padding: "0.5rem", textAlign: "right" }}>
          <Button
            variant="contained"
            color="error"
            onClick={handleBulkDelete}
            disabled={selectedMessages.length === 0}
          >
            Delete Selected ({selectedMessages.length})
          </Button>
        </div>
      )}

      <div
        className={"messages-container" + (lightTheme ? "" : " dark")}
        ref={scrollableDivRef}
      >
        {showAlert && (
          <Alert
            severity="error"
            sx={{ borderRadius: "20px" }}
            onClick={() => setShowalert(false)}
          >
            <AlertTitle>Error sending message !!</AlertTitle>
            check your network connection.
          </Alert>
        )}
        {otherUsersTyping.length > 0 && !ChatInfo.isGroup ? <Typing /> : null}
        {sendingMsg ? <SendingMsg content={messageLoadingContent} /> : null}
        {loading ? (
          <MessageSkeleton />
        ) : (
          allMessagesCopy
            .slice()
            .reverse()
            .map((message, index) => {
              const commonProps = {
                selectable: selectionMode,
                isSelected: selectedMessages.includes(message._id),
                onToggleSelect: () => toggleSelection(message._id),
              };
              return message.sender._id === userId ? (
                <SelfMessage key={index} props={message} {...commonProps} />
              ) : (
                <MessageOthers key={index} props={message} {...commonProps} />
              );
            })
        )}
      </div>
      <div className={"text-input-Area" + (lightTheme ? "" : " dark")}>
        <IconButton onClick={() => setViewEmoji(!viewEmoji)}>
          {viewEmoji ? (
            <ClearSharpIcon className={"icon" + (lightTheme ? "" : " dark")} />
          ) : (
            <AddReactionSharpIcon className={"icon" + (lightTheme ? "" : " dark")} />
          )}
        </IconButton>
        <input
          placeholder="Type a Message"
          className={"search-box" + (lightTheme ? "" : " dark")}
          value={messageContent}
          onChange={(e) => {
            setMessageContent(e.target.value);
            handleTyping();
          }}
          onFocus={handleTyping}
          onBlur={handleStopTyping}
          onKeyDown={(event) => {
            if (event.code === "Enter") {
              sendMessage();
              setMessageContent("");
              handleStopTyping();
            }
          }}
        />
        <IconButton onClick={() => sendMessage()}>
          <SendIcon className={"icon" + (lightTheme ? "" : " dark")} />
        </IconButton>
      </div>
      <Modal title="Group Info" open={isModalOpen} onOk={handleOk} onCancel={handleCancel}>
        <div>
          {groupLoading ? (
            <Facebook />
          ) : (
            groupData && (
              <div>
                {/* Add Member Button Container inside Group Info */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <h3>Group Members</h3>
                  <IconButton onClick={() => setShowAddMember(true)}>
                    <AddIcon />
                  </IconButton>
                </div>
                {groupData.userMappings.map((userMapping, index) => (
                  <div key={index}>
                    <Members
                      name={userMapping.username}
                      isAdmin={userMapping.userId === groupData.adminId}
                      userImage={
                        userMapping.userImage
                          ? bufferToImage(userMapping.userImage)
                          : null
                      }
                    />
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </Modal>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        style={{ color: "red" }}
      >
        <DialogTitle id="alert-dialog-title">{"Leave this group"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to leave this group? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              handleClose();
              exitGroupChat();
            }}
          >
            Agree
          </Button>
          <Button onClick={handleClose} autoFocus>
            Disagree
          </Button>
        </DialogActions>
      </Dialog>
      {viewEmoji && (
        <div
          className={"messages-container" + (lightTheme ? "" : " dark")}
          style={{ marginTop: "0", flex: 3 }}
        >
          <EmojiPicker
            onEmojiClick={(e) => setMessageContent((prev) => prev + e.emoji)}
            width="100%"
            height="100%"
            theme={lightTheme ? null : "dark"}
            searchDisabled
            emojiStyle="native"
            lazyLoadEmojis={false}
            autoFocusSearch={false}
          />
        </div>
      )}
      {showAddMember && (
        <AddMember
          open={showAddMember}
          onClose={() => setShowAddMember(false)}
          groupId={ChatInfo._id}
          existingMembers={
            ChatInfo && ChatInfo.users
              ? ChatInfo.users.map((u) => u._id)
              : []
          }
          onMembersAdded={(updatedGroup) => {
            console.log("New members added:", updatedGroup);
          }}
        />
      )}
    </>
  );
}
