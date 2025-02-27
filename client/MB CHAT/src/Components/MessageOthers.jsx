import React from "react";
import Avatar from "@mui/material/Avatar";
import { bufferToImage } from "./Utils";

export default function MessageOthers({ props }) {
  const date = new Date(props.createdAt);

  // Force 24-hour format using the user's local time zone
  const options = { hour: "2-digit", minute: "2-digit", hour12: false };
  const formattedTime = date.toLocaleTimeString([], options);

  const isGroup = props.chat.isGroupChat;

  return (
    <>
      <style>
        {`
          .other-message-container {
            position: relative;
            display: inline-block;
            margin: 10px 0;
            margin-right: auto; 
            cursor: pointer;
          }

          .conversation-container.extra {
            max-width: min(60ch, 80vw);
            border-radius: 10px;
            padding: 10px 14px;
            margin-right: auto;
            white-space: pre-wrap;
            word-break: break-word;
            overflow-wrap: anywhere;
            position: relative;
            padding-bottom: 20px; /* Provides bottom padding for the timestamp */
          }

          .other-text-content {
            /* Additional styling if needed */
          }

          .self-timeStamp {
            font-size: 0.75rem;
            margin-top: 5px;
          }

          @media (max-width: 600px) {
            .self-timeStamp {
              font-size: 0.7rem;
            }
          }
        `}
      </style>

      <div className="other-message-container" onClick={() => console.log(props)}>
        <div className="conversation-container extra">
          {isGroup && props.sender.image ? (
            <Avatar
              className="con-icon"
              sx={{ width: 30, height: 30, borderRadius: 25 }}
              src={bufferToImage(props.sender.image)}
            />
          ) : null}

          <div className="other-text-content">
            {isGroup ? (
              <p className="con-title" style={{ fontSize: "small" }}>
                {props.sender.name}{" "}
              </p>
            ) : null}

            <p style={{ color: "black", margin: 0 }}>{props.content}</p>

            {/* Display 24-hour local time */}
            <p className="self-timeStamp" style={{ color: "black" }}>
              {formattedTime}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
