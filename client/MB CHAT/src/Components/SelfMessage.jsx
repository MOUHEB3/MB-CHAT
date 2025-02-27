import React, { useState } from "react";
import { IconButton, MenuItem, Slide, Menu } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import axios from "axios";

// Animated check icon component (red)
const AnimatedCheckIcon = () => (
  <CheckIcon className="animated-check-icon" />
);

export default function SelfMessage({
  props,
  onMessageDeleted,
  selectable,
  isSelected,
  onToggleSelect,
}) {
  const date = new Date(props.createdAt);
  const options = { hour: "2-digit", minute: "2-digit", hour12: false };
  const formattedTime = date.toLocaleTimeString([], options);

  const [viewTimestamp, setViewTimestamp] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isAnimatingFunny, setIsAnimatingFunny] = useState(false);

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDeleteMessage = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const deleteUrl = `${process.env.REACT_APP_API_KEY}/message/${props._id}`;
      console.log("Deleting message via:", deleteUrl);
      await axios.delete(deleteUrl, config);
      console.log("Message deleted successfully on the server");
      if (onMessageDeleted) onMessageDeleted(props._id);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
    handleMenuClose();
  };

  const handleCopyMessage = (e) => {
    e.stopPropagation();
    navigator.clipboard
      .writeText(props.content)
      .then(() => console.log("Message copied to clipboard!"))
      .catch((err) => console.error("Failed to copy message:", err));
    handleMenuClose();
  };

  const handleContainerClick = () => {
    if (selectable) {
      if (isSelected) {
        // If already selected, unselect without animation.
        if (onToggleSelect) onToggleSelect();
      } else {
        // Trigger funny dance animation before selecting.
        setIsAnimatingFunny(true);
      }
    } else {
      setViewTimestamp(!viewTimestamp);
    }
  };

  return (
    <>
      <style>{`
        /* Keyframe Animations */
        @keyframes fadeInMessage {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popCheck {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes funnyDance {
          0% { transform: rotate(0deg); }
          20% { transform: rotate(-20deg); }
          40% { transform: rotate(20deg); }
          60% { transform: rotate(-10deg); }
          80% { transform: rotate(10deg); }
          100% { transform: rotate(0deg); }
        }
        /* Container Styles */
        .self-message-container {
          position: relative;
          display: inline-block;
          margin: 10px 0;
          margin-left: auto;
          cursor: pointer;
          max-width: 100%;
          animation: fadeInMessage 0.5s ease-out;
          transition: background 0.3s, transform 0.3s;
        }
        /* In selection mode, no extra hover effect in normal state */
        .self-message-container.selectable:hover {
          /* You can add a subtle effect here if desired */
        }
        /* Selected state */
        .self-message-container.selected {
          background-color: rgba(52,152,219,0.1);
        }
        /* Funny dance animation when selecting */
        .funny-dance {
          animation: funnyDance 0.8s ease-out;
        }
        .messageBox {
          max-width: min(40ch, 65vw);
          border-radius: 10px;
          padding: 10px 14px;
          white-space: pre-wrap;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .self-timeStamp {
          font-size: 0.75rem;
          margin-top: 5px;
          color: black;
        }
        .message-options-button {
          position: absolute;
          top: 50%;
          left: -35px;
          transform: translateY(-50%);
          display: inline-flex;
          transition: transform 0.2s ease-in-out;
          z-index: 9999;
        }
        @media (max-width: 600px) {
          .messageBox {
            max-width: 50vw !important;
          }
          .self-timeStamp {
            font-size: 0.7rem;
          }
          .message-options-button {
            left: -30px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            z-index: 9999 !important;
          }
        }
        @media (min-width: 1200px) {
          .messageBox {
            max-width: 400px;
          }
        }
        /* Animated Check Icon Styles (red) */
        .animated-check-icon {
          position: absolute;
          top: -6px;
          right: -6px;
          font-size: 20px;
          color: #e74c3c;
          animation: popCheck 0.5s ease-out;
          pointer-events: none;
        }
      `}</style>

      <div
        className={`self-message-container ${selectable ? "selectable" : ""} ${selectable && isSelected ? "selected" : ""} ${isAnimatingFunny ? "funny-dance" : ""}`}
        onClick={handleContainerClick}
        onAnimationEnd={() => {
          if (isAnimatingFunny) {
            // After the funny dance animation, mark the message as selected.
            if (onToggleSelect) onToggleSelect();
            setIsAnimatingFunny(false);
          }
        }}
      >
        <div className="messageBox">
          <p style={{ margin: 0, color: "black" }}>{props.content}</p>
          {viewTimestamp && !selectable && (
            <p className="self-timeStamp">{formattedTime}</p>
          )}
        </div>

        {!selectable && (
          <IconButton
            className="message-options-button"
            size="small"
            onClick={handleMenuClick}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        )}

        {!selectable && (
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            TransitionComponent={Slide}
            TransitionProps={{ direction: "left" }}
            anchorOrigin={{ vertical: "center", horizontal: "left" }}
            transformOrigin={{ vertical: "center", horizontal: "right" }}
            PaperProps={{
              sx: {
                borderRadius: 1,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                fontSize: "0.85rem",
                padding: 0,
              },
            }}
          >
            <MenuItem
              sx={{
                fontSize: "0.85rem",
                padding: "6px 12px",
                display: "flex",
                alignItems: "center",
                color: "red",
                transition: "transform 0.2s ease-in-out",
                "&:hover": {
                  transform: "scale(1.05)",
                  backgroundColor: "#ffe5e5",
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteMessage();
              }}
            >
              <DeleteOutlineIcon sx={{ mr: 1, fontSize: "1rem", color: "red" }} />
              Delete Message
            </MenuItem>
            <MenuItem
              sx={{
                fontSize: "0.85rem",
                padding: "6px 12px",
                display: "flex",
                alignItems: "center",
                transition: "transform 0.2s ease-in-out",
                "&:hover": {
                  transform: "scale(1.05)",
                  backgroundColor: "#f0f0f0",
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleCopyMessage(e);
              }}
            >
              <ContentCopyIcon sx={{ mr: 1, fontSize: "1rem" }} />
              Copy Message
            </MenuItem>
          </Menu>
        )}

        {selectable && isSelected && <AnimatedCheckIcon />}
      </div>
    </>
  );
}
