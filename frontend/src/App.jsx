import { useState } from "react";
import "./App.css";
import io from 'socket.io-client';
import Editor from '@monaco-editor/react'
import { useEffect } from "react";
// import { response } from "express";

const socket = io("http://localhost:5000");

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("//start coding here");
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [output, setOutput] = useState("");
  const [version, setVersion] = useState("*");

  useEffect(()=>{
    socket.on("userJoined",(users)=>{
      setUsers(users);
    });

    socket.on("codeUpdate", (newCode)=>{
      setCode(newCode);
    });

    socket.on("userTyping", (user)=>{
      setTyping(`${user} is typing`);
      setTimeout(() => {
        setTyping("");
      }, 2000);
    })
    socket.on("languageUpdate", (newLanguage)=>{
      setLanguage(newLanguage);
    });

    socket.on("codeResponse", (response)=>{
      setOutput(response.run.output);
    });



    return ()=>{
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
      socket.off("codeResponse");
    }
  }, []);

  useEffect(()=>{
    const handleBeforeUnload = ()=>{
      socket.emit("leaveRoom");
    }

    window.addEventListener("beforeinload", handleBeforeUnload);
    return ()=>{
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, []);


  const joinRoom = () => {
    // console.log(roomId, userName);
    if (roomId && userName) {
      socket.emit("join", { roomId, userName });
      setJoined(true);
    }
  }

  const leaveRoom = ()=>{
    socket.emit("leaveRoom");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode("");
    setLanguage("javascript");
  }

  const copyRoomId = (newCode) => {
    navigator.clipboard.writeText(roomId);
    setCopySuccess("Copied");
    setTimeout(() => {
      setCopySuccess("");
    }, 2000);
  }

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", {roomId, code:newCode});
    socket.emit("typing",{roomId, userName});
  }

  const handleLanguageChange = (e)=>{
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit("languageChange", {roomId, language: newLanguage});
  }

  const runCode = ()=>{
    socket.emit("compileCode", {code, roomId, language, version})
  }
 
  if (!joined) {
    return (
      <div className="join-container">
        <div className="join-form">
          <h1>Join Code Room</h1>
          <input type="text" placeholder="Enter Room Id" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
          <input type="text" placeholder="Enter your name" value={userName} onChange={(e) => setUserName(e.target.value)} />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      </div>
    )
  }


  return <div className="editor-container">
    <div className="sidebar">
      <div className="room-info">
        <h2>Code Room: {roomId}</h2>
        <button onClick={copyRoomId} className="copy-button">Copy Room Id</button>
        {copySuccess && <span className="copy-success">{copySuccess}</span>}
      </div>
      <h3>Users in room</h3>
      <ul>
        {
          users.map((user,index)=>(
            <li key = {index}>{user}</li>
          ))
        }
      </ul>
      <p className="typing-indicator">{typing}</p>
      <select className="language-selector" value={language} onChange={handleLanguageChange}>
        <option value="javascript">JavaScript</option>
        <option value="python">Python</option>
        <option value="cpp">C++</option>
      </select>
      <button className="leave-button" onClick={leaveRoom}>Leave Room</button>
    </div>
    <div className="editor-wrapper">
      <Editor
        height={"60%"}
        defaultLanguage={language} language={language}
        value={code}
        onChange={handleCodeChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14
        }
        }
      />
      <button className="run-btn" onClick={runCode}>Execute</button>
      <textarea className="output-console" value={output} readOnly placeholder="Output will appear here"></textarea>

    </div>
  </div>
}

export default App