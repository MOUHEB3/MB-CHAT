import React, { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  CircularProgress,
  Box,
  Paper,
  Typography,
  useMediaQuery,
  useTheme,
  InputAdornment,
  Grow,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import axios from "axios";
import { bufferToImage } from "./Utils";
import { useNavigate } from "react-router-dom";
import socket from "../socket";
import { message } from "antd";

// Custom AnimatedListItem helper component with fixed ref cleanup and Grow transition
const AnimatedListItem = ({ children, timeout = 300 }) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current; // Copy ref.current into a local variable
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(element);
    return () => {
      if (element) observer.unobserve(element);
    };
  }, []);

  return (
    <Grow in={inView} timeout={timeout}>
      <div ref={ref}>{children}</div>
    </Grow>
  );
};

export default function AddMember({
  open,
  onClose,
  groupId,
  existingMembers, // Array of user IDs already in the group
  onMembersAdded,  // Callback to update group info in parent
}) {
  const [messageApi, contextHolder] = message.useMessage();
  const URL = process.env.REACT_APP_API_KEY;
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isDark = theme.palette.mode === "dark";

  const [searchTerm, setSearchTerm] = useState("");
  const [fetchedUsers, setFetchedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Debounced fetch for users based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFetchedUsers([]);
      return;
    }
    setLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const { data } = await axios.get(
          `${URL}/user/fetchUsers?search=${encodeURIComponent(searchTerm)}`,
          config
        );
        setFetchedUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, token, URL]);

  // Exclude users already in the group
  const availableUsers = fetchedUsers.filter(
    (user) => !existingMembers.includes(user._id)
  );

  const handleAddUser = async (user) => {
    setAdding(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = { groupId, usersToAdd: [user._id] };
      const { data } = await axios.put(`${URL}/chats/addMember`, payload, config);

      if (data.alreadyAdded) {
        messageApi.open({
          type: "warning",
          content: "User is already in the group",
          className: "custom-class",
          style: { marginTop: "20vh" },
        });
      } else {
        if (onMembersAdded) onMembersAdded(data);
        if (socket) socket.emit("memberAdded", { groupId, user });
        messageApi.open({
          type: "success",
          content: "User added successfully",
          className: "custom-class",
          style: { marginTop: "20vh" },
        });
        if (user._id === localStorage.getItem("userId")) {
          navigate(`/chat/${groupId}`);
        }
      }
    } catch (error) {
      console.error("Error adding user:", error);
      const errMsg = error.response?.data?.message || "Error adding user";
      messageApi.open({
        type: "error",
        content: errMsg,
        className: "custom-class",
        style: { marginTop: "20vh" },
      });
    } finally {
      setAdding(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setFetchedUsers([]);
  };

  return (
    <>
      {contextHolder}
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <Paper
          elevation={8}
          sx={{
            p: 3,
            borderRadius: "16px",
            backgroundColor: isDark ? "#2d3941" : "#fff",
            color: isDark ? "lightgray" : "#333",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            transition: "background 0.3s ease",
          }}
        >
          <DialogTitle sx={{ pb: 2 }}>
            <Typography
              variant="h6"
              component="div" // Prevent h6 inside h2
              align="center"
              sx={{ fontWeight: "bold", color: isDark ? "lightgray" : "#333" }}
            >
              Add Members
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <TextField
                id="search-users-input"
                fullWidth
                placeholder="Search users..."
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                sx={{
                  backgroundColor: "#fff",
                  borderRadius: "16px",
                  transition: "width 0.3s ease, box-shadow 0.3s ease",
                  width: searchFocused ? "100%" : "95%",
                  boxShadow: "0px 3px 8px rgba(0,0,0,0.15)",
                }}
                InputProps={{
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton onClick={handleClearSearch} edge="end">
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                <CircularProgress sx={{ color: isDark ? "lightgray" : "#333" }} />
              </Box>
            ) : (
              <List
                sx={{
                  maxHeight: isXs ? "250px" : "300px",
                  overflowY: "auto",
                  "&::-webkit-scrollbar": { display: "none" },
                  transition: "max-height 0.3s ease-in-out",
                }}
              >
                {availableUsers.map((user) => (
                  <AnimatedListItem key={user._id} timeout={300}>
                    <ListItem
                      button
                      onClick={() => handleAddUser(user)}
                      sx={{
                        borderBottom: "1px solid",
                        borderColor: isDark ? "rgba(255,255,255,0.2)" : "#ddd",
                        transition: "background 0.3s, transform 0.3s",
                        "&:hover": {
                          background: isDark ? "rgba(255,255,255,0.1)" : "#e0e0e0",
                          transform: "scale(1.02)",
                        },
                      }}
                    >
                      <ListItemAvatar>
                        {user.image ? (
                          <Avatar src={bufferToImage(user.image)} />
                        ) : (
                          <Avatar
                            sx={{
                              bgcolor: isDark ? "#444" : "#C5BAAF",
                              color: isDark ? "lightgray" : "#fff",
                            }}
                          >
                            {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                          </Avatar>
                        )}
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.name || "Unknown"}
                        secondary={user.email || ""}
                        sx={{ ml: 1, color: isDark ? "lightgray" : "#333" }}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleAddUser(user)}
                          disabled={adding}
                          sx={{ color: isDark ? "lightgray" : "#C5BAAF" }}
                        >
                          <AddIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </AnimatedListItem>
                ))}
                {availableUsers.length === 0 && !loading && (
                  <ListItem>
                    <ListItemText primary="No users found" sx={{ color: isDark ? "lightgray" : "#333" }} />
                  </ListItem>
                )}
              </List>
            )}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                variant="contained"
                onClick={onClose}
                disabled={adding}
                sx={{
                  bgcolor: isDark ? "#444" : "#C5BAAF",
                  borderRadius: "16px",
                  textTransform: "none",
                }}
              >
                Cancel
              </Button>
            </Box>
          </DialogContent>
        </Paper>
      </Dialog>
    </>
  );
}
