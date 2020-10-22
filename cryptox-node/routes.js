// This file is required by app.js. It sets up event listeners
// for the two main URL endpoints of the application - /create and /chat/:id
// and listens for socket.io messages.

// Use the gravatar module, to turn email addresses into avatar images:

var gravatar = require('gravatar');
var db = require('./db');

// Export a function, so that we can pass 
// the app and io instances from the app.js file:

module.exports = function (app, io) {

    app.get('/', function (req, res) {

        // Render views/home.html
        res.render('home');
    });

    app.get('/create', function (req, res) {

        // Generate unique id for the room
        var id = Math.round((Math.random() * 1000000));

        // Redirect to the random room
        res.redirect('/chat/' + id);
    });

    app.get('/chat/:id', function (req, res) {

        // Render the chant.html view
        res.render('chat');
    });

    // Initialize a new socket.io application, named 'chat'
    var chat = io.on('connection', function (socket) {

        // When the client emits the 'load' event, reply with the
        // number of people in this chat room

        socket.on('load', function (data) {

            findClientsSocket(io, data)
                .then(function (room) {
                    if (room.length === 0) {
                        socket.emit('peopleinchat', {
                            number: 0
                        });
                    }
                    else {
                        socket.emit('peopleinchat', {
                            number: 1,
                            user: room[0].user,
                            id: data
                        });
                    }
                });

        });

        // When the client emits 'login', save his name and avatar,
        // and add them to the room
        socket.on('login', function (data) {

            var room = [];
            var dialog = {};
            return findClientsSocket(io, data.id)
                .then(function (clients) {
                    room = clients;
                    // Only two people per room are allowed
                    // if (room.length < 2) {

                    // Use the socket object to store data. Each client gets
                    // their own unique socket object

                    socket.user = data.user;
                    socket.room = data.id;

                    // Add the client to the room
                    socket.join(data.id);
                    return db.getDialog(data.id);

                    // }
                })
                // .then(function (res) {
                //     dialog = res;
                //     return db.addUserToDialog(data.user, dialog[0].id);
                // })
                .then(function (res) {
                    dialog = res;
                    return db.getMessages(dialog[0].id);
                })
                .then(function (messages) {
                    var usernames = [];
                    for (var i = 0; i < room.length; i++) {
                        usernames.push(room[i].username);
                    }

                    chat.in(data.id).emit('startChat', {
                        boolean: true,
                        id: data.id,
                        users: usernames,
                        messages: messages
                    });
                })
                .catch(function (err) {
                    console.log(err);
                })
        });

        // Somebody left the chat
        socket.on('disconnect', function () {

            // Notify the other person in the chat room
            // that his partner has left

            socket.broadcast.to(this.room).emit('leave', {
                boolean: true,
                room: this.room,
                user: this.user,
                avatar: this.avatar
            });

            // leave the room
            socket.leave(socket.room);
        });


        // Handle the sending of messages
        socket.on('msg', function (data) {
            var dialog_id, roomMateId, user = data.user;
            db.getDialog(socket.room)
                .then(function (dialog) {
                    dialog_id = dialog[0].id;
                    var message = {
                        dialog_id: dialog[0].id,
                        text: data.msg
                    };

                    return db.saveMessage(data.user, message);
                })
                .then(function (message) {
                    return db.getMessages(dialog_id);
                })
                .then(function (messages) {
                    // When the server receives a message, it sends it to the other person in the room.
                    socket.broadcast.to(socket.room).emit('receive', {
                        msg: data.msg,
                        user: data.user,
                        messages: messages
                    });
                    // socket.broadcast.emit('updateCountUnreadRooms');
                    return db.getRoommates(data.user, socket.room)
                })
                .then(function (resolve) {
                    if (!resolve.length) {
                        return db.getTransaction(socket.room)
                            .then(function (transaction) {
                                roomMateId = transaction[0].admin_id == user ? transaction[0].operator_id : transaction[0].admin_id;
                                return db.addUserToDialog(roomMateId, dialog_id)
                            })
                            .then(function (res) {
                                return db.updateTransactionStatus(dialog_id, roomMateId, 1);
                            })
                            .catch(function (error) {
                                console.log(error);
                            });
                    }

                    resolve.forEach(function (user) {
                        db.updateTransactionStatus(dialog_id, user.user_id, 1);
                        // db.countUnreadRooms(user.user_id)
                        // 	.then(function(count) {
                        // 		socket.broadcast.emit('countUnreadRooms/' + user.user_id, count);
                        // 	});
                    })
                })
                .catch(function (err) {
                    socket.emit('_error', error);
                })

        });

        socket.on('countUnreadRooms', function (data) {
            db.countUnreadRooms(data.user).then(
                function (resolve) {
                    if (socket.messages) {
                        if (resolve.messages && socket.messages.id < resolve.messages.id) {
                            socket.messages = resolve.messages;
                        } else {
                            resolve.messages = null;
                        }
                    } else {
                        socket.messages = resolve.messages;
                    }
                    socket.emit('countUnreadRooms/' + data.user, resolve);
                },
                function (error) {
                    socket.emit('_error', error);
                }
            )
        });

        socket.on('readMessage', function (data) {
            var status = 1, unreadRooms = 0, dialog_id = 0;
            db.getDialog(socket.room)
                .then(function (resolve) {
                    dialog_id = resolve[0].id;
                    return db.updateMessageStatus(socket.user, data.messageId, dialog_id, status)
                })
                .then(function (resolve) {
                    return db.countUnreadRooms(socket.user)
                })
                .then(function (resolve) {
                    unreadRooms = resolve;
                    return db.updateTransactionStatus(dialog_id, socket.user, 0)
                })
                .then(function (resolve) {
                    return db.getMessages(dialog_id);
                })
                .then(function (messages) {
                    // socket.broadcast.emit('countUnreadRooms/' + socket.user, unreadRooms);
                    socket.broadcast.to(socket.room).emit('receive', {msg: '', user: socket.user, messages: messages});

                })
                .catch(function (error) {
                    socket.emit('_error', error);
                })

        });
    });
};

function findClientsSocket(io, roomId, namespace) {

    return db.getDialog(roomId)
        .then(function (dialog) {
            return db.getUsersFromDialog(dialog[0].id, {});
        }).then(function (users) {
            return users;
        })
        .catch(function (error) {
            console.log(error);
        });
}


