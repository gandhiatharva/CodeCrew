import { Socket } from 'dgram';
import express from 'express';
import http from 'http';
import { version } from 'os';
import { Server } from "socket.io";
import axios from 'axios';

const app = express();

const server = http.createServer(app);

const url = `https://codecrew-3.onrender.com`;
const interval = 30000;

function reloadWebsite() {
  axios
    .get(url)
    .then((response) => {
      console.log("website reloded");
    })
    .catch((error) => {
      console.error(`Error : ${error.message}`);
    });
}

setInterval(reloadWebsite, interval);




const PORT = process.env.PORT || 5000;
const io = new Server(server, {
    // as to where we can use this 
    cors:{
        origin:"*",
        methods: ["GET", "POST"]
    },
});


// using this we have create an instace for user to join
const rooms = new Map();


// if we get connection from somewhere, from which Id has used connected from

io.on("connection", (socket)=>{
    // will give from which is has user been connected too 
    console.log("user connected", socket.id);

    // to check if user is in a room or not, current user in room or not
    let currentRoom = null;
    let currentUser = null;
    
    // we are trying to make a user join a room, we will get this info
    socket.on("join", ({roomId, userName})=>{
        // is a user is in a room already then this condition will be followed
        if(currentRoom){
            // if a user is in the current room, we first delete it from the
            // current room and notify to all other people in that room that it has left
            socket.leave(currentRoom);
            rooms.get(currentRoom).delete(currentUser);
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)));
        }
        
        // now if a user has not joined, we will make it join the room which
        // we have taken from the user
        currentRoom = roomId;
        currentUser = userName;
        
        // we make the user join the socket from here 
        socket.join(roomId);
        
        // we will check if this room has already not been createed beforehand
        // if yes, then we set the user in that room itself
        if(!rooms.has(roomId)){
            rooms.set(roomId, new Set());
        }
        
        // if that room does not already exist, then we need to create the room
        rooms.get(roomId).add(userName);
        // notify all that a room has beeen create and notify all 
        io.to(roomId).emit("userJoined", Array.from(rooms.get(currentRoom)));
    });


    // if we change the code, then it should be shown to all the users in that room, and for that we make this fucntion
    socket.on("codeChange", ({roomId, code})=>{
        //so in which roomId we need to change and in what code needs to be shown

        // in roomId we need to emit codeUpdate instance called and what we pass is code
        socket.to(roomId).emit("codeUpdate", code);
    });

    // if someone is leaving the room, then we need to do these steps, and make curretRoom and currentUser has to be made NULL
    socket.on("leaveRoom", ()=>{
          if(currentRoom && currentUser){
            rooms.get(currentRoom).delete(currentUser);
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)))

            socket.leave(currentRoom);

            currentRoom = null;
            currentUser = null;
        }
    });

    // to show which user is typing we do this
    // we need roomId and we need which user is typing 
    socket.on("typing", ({roomId, userName})=>{
        // this means for this roomId we need to show userTyping and for this user 
        socket.to(roomId).emit("userTyping", userName);
    });

    // when we change the langauge, it showed be changed for the all the users in the socket so for that we do thisand call the 
    // languageUpdate function
    socket.on("languageChange", ({roomId, language})=>{
        io.to(roomId).emit("languageUpdate", language);
    })

    socket.on("compileCode", async({code, roomId, language, version})=>{
        if(rooms.has(roomId)){
            const room = rooms.get(roomId);
            const response = await axios.post("https://emkc.org/api/v2/piston/execute",{
               language, version, files:[{
                content: code
               }] 
            })

            room.output = response.data.run.output;
            io.to(roomId).emit("codeResponse", response.data);
        }
    });

    // if a user reloads, we want it to leave the room
    socket.on("disconnect", ()=>{
        // so if we have a room and we have a user, then from this room we need to delete the current user and then notify all 
        // the users that we have removed the user
        if(currentRoom && currentUser){
            // we delete the user from the room
            rooms.get(currentRoom).delete(currentUser);
            // notify others that it has left the room
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)))
        }
        console.log(`user disonnected`);
    })

});

server.listen(PORT, ()=>{
    console.log("Server is running on port:", PORT);
});
