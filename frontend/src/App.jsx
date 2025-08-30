import { useState, useEffect } from "react";
import "./App.css";
import io from 'socket.io-client';
import Editor from '@monaco-editor/react';

// set up socket connection
const socket = io("https://codecrew-3.onrender.com");

const App = () => {
  // state if a user has joined in a room or not (false initially)
  const [joined, setJoined] = useState(false);
  // to get room id and username (empty initially)
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  //for which language we are using 
  const [language, setLanguage] = useState("C++");
  // the code we are wriitng in the section
  const [code, setCode] = useState("//start coding here");
  // to show if we have copied or not a the roomId or not
  const [copySuccess, setCopySuccess] = useState("");
  //using this we store all the users 
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [output, setOutput] = useState("");
  const [version, setVersion] = useState("*");

  useEffect(()=>{
    // to set the users that are there in the room and in that socket
    socket.on("userJoined", (users) => {
      setUsers(users);
    });

    // to update the code that one has written
    socket.on("codeUpdate", (newCode) => {
      setCode(newCode);
    });

    // to show which user is typing we write this and also create a different state, which user is typing and tell it to everyone in
    // the room
    socket.on("userTyping", (user) => {
      setTyping(`${user} is typing`);
      setTimeout(() => {
        setTyping("");
      }, 2000);
    });

    // this is so that language is changed for all the users at the same time in the room, so if one person in the room changes it
    // then for all the members, the language is changed.
    socket.on("languageUpdate", (newLanguage) => {
      setLanguage(newLanguage);
    });

    socket.on("codeResponse", (response) => {
      setOutput(response.run.output);
    });

    // this is cleanUp, used along useEffect
    // we need to do this so as we had started the socket and now we need to off it also and which socket was on, we need to stop that 
    // and it isnt run again and again 
    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
      socket.off("codeResponse");
    };
  }, []);

  useEffect(()=>{
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    //clean Up function to remove eventListed so that it is called only once
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // join a room for the first time
  const joinRoom = () => {
    if (roomId && userName) {
      socket.emit("join", { roomId, userName });
      setJoined(true);
    }
  };

  // when we click the leaveRoom button, then we need to do the following things
  const leaveRoom = () => {
    socket.emit("leaveRoom");
    // so that we go to the home page
    setJoined(false);
    // for that user we have no room and also in that room no username so we make it defauly
    setRoomId("");
    setUserName("");
     // to go the default language and code 
    setCode("");
    setLanguage("C++");
  };

  // this function is used to implement the functionality where we copy the roomId
  const copyRoomId = () => {
    // this is a standrd way to copy 
    navigator.clipboard.writeText(roomId);
    setCopySuccess("Copied");
    // will come for 2 second and them will become empty
    setTimeout(() => setCopySuccess(""), 2000);
  };

  // whatever we get the newCode, we put the code value as new code that we have gotten
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
    socket.emit("typing", { roomId, userName });
  };

  // this function is called when we want the to change the langauge for everyone in the room, it is called when we select language
  //selector from the frontend, it calls the backend languageChange
  const handleLanguageChange = (e) => {
    // e is the instance
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit("languageChange", { roomId, language: newLanguage });
  };

  const runCode = () => {
    socket.emit("compileCode", { code, roomId, language, version });
  };

  // if the user has not joined a room
  if (!joined) {
    return (
      <div className="join-container">
        <div className="join-form">
          <h1>Join Code Room</h1>
          {/* Whenever there is change in these two input boxes, React updates roomId and userName */}
          <input type="text" placeholder="Enter Room Id" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
          <input type="text" placeholder="Enter your name" value={userName} onChange={(e) => setUserName(e.target.value)} />
          {/* On clicking the button with "Join Room", joinRoom function gets triggered */}
          <button onClick={joinRoom}>Join Room</button>
        </div>
      </div>
    );
  }

  // when the user has already joined
  return (
    <div className="editor-container">
      <div className="sidebar">
        <div className="room-info">
          <h2>Code Room: {roomId}</h2>
          <button onClick={copyRoomId} className="copy-button">Copy Room Id</button>
          {/* if we are able to copy, we show the message */}
          {copySuccess && <span className="copy-success">{copySuccess}</span>}
        </div>

        {/* Show all users currently in the room */}
        <h3>Users in room</h3>
        <ul>
          {/* to show all the users in  */}
          {users.map((user, index) => (
            <li key={index}>{user}</li>
          ))}
        </ul>

        {/* Show typing indicator  and which user is typing will come from the state typing which shows which user is typing*/}
        <p className="typing-indicator">{typing}</p>

        {/* Select language to code in */}
        {/* if we change the langauge then it also need to be handled so for that we create a fucntion called handleLanguageChange */}
        <select className="language-selector" value={language} onChange={handleLanguageChange}>
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="cpp">C++</option>
        </select>

        <button className="leave-button" onClick={leaveRoom}>Leave Room</button>
      </div>

      {/* Main editor wrapper */}
      <div className="editor-wrapper">
        <Editor
          height={"60%"}
          defaultLanguage={language}
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14
          }}
        />
        <button className="run-btn" onClick={runCode}>Execute</button>
        <textarea
          className="output-console"
          value={output}
          readOnly
          placeholder="Output will appear here"
        ></textarea>
      </div>
    </div>
  );
};

export default App;
