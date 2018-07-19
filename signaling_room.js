"use strict";

var srv = require('http').Server();
var io = require('socket.io')(srv);
var port = 3002;
srv.listen(port);
console.log('signaling server started on port:' + port);

// This callback function is called every time a socket
// tries to connect to the server
io.on('connection', function(socket) {
  // --- multi room ---
  // 接続してきたクライアントがルーム（会議室）に入室要求を送ってきたら、socket.ioのサーバ側でそのルームに join() する
  socket.on('enter', function(roomname) {
    socket.join(roomname);
    console.log('id=' + socket.id + ' enter room=' + roomname);
    setRoomname(roomname);
  });

  function setRoomname(room) {
    socket.roomname = room;
  }

  function getRoomname() {
    var room = socket.roomname;
    return room;
  }

  // ルームの全員に送信
  function emitMessage(type, message) {
    // --- multi room ---
    var roomname = getRoomname();
    if (roomname) {
      // ルーム内に送る
      console.log('===== message broadcast to room -->' + roomname);
      socket.broadcast.to(roomname).emit(type, message);
    }
    else {
      // ルーム未入室の場合は全体に送る
      console.log('===== message broadcast all');
      socket.broadcast.emit(type, message);
    }
  }

  // When a user send a SDP message
  // broadcast to all users in the room
  socket.on('message', function(message) {
    var date = new Date();
    message.from = socket.id; // 送信元のIDをメッセージに追加
    console.log(date + 'id=' + socket.id + ' Received Message: ' + JSON.stringify(message));

    // get send target
    var target = message.sendto;
    if (target) {
      // 特定の相手に送る場合
      console.log('===== message emit to -->' + target);
      socket.to(target).emit('message', message);
      return;
    }

    // broadcast in room
    emitMessage('message', message);
  });

  // When the user hangs up
  // broadcast bye signal to all users in the room
  socket.on('disconnect', function() {
    console.log((new Date()) + ' Peer disconnected. id=' + socket.id);
 
    // --- emit ---
    emitMessage('user disconnected', {id: socket.id});

    // --- leave room ---
    var roomname = getRoomname();
    if (roomname) {
      socket.leave(roomname);
    }
  });
});